import {
  getApplicationById,
  logToApplication,
  updateApplicationAutomationStatus,
} from '@/lib/db/applications'
import { createServerClient } from '@/lib/db/client'
import { applyToJob } from './platforms/playwright-apply'

/**
 * Routes an application to the correct automation platform handler.
 * This function orchestrates the entire automation process for a single application.
 */
export async function routeApply(applicationId: string): Promise<void> {
  const log = (message: string) => logToApplication(applicationId, message)
  const supabase = createServerClient()

  try {
    await log('Automation process started.')
    await updateApplicationAutomationStatus(applicationId, 'in_progress')

    const application = await getApplicationById(applicationId)

    if (!application || !application.job || !application.candidate) {
      throw new Error('Application, job, or candidate data not found.')
    }
    if (!application.job.source_url) {
      throw new Error('Job has no source URL, cannot apply automatically.')
    }

    const activeResume = application.candidate.resumes?.find(r => r.processing_status === 'ready')
    if (!activeResume || !activeResume.parsed_data || !activeResume.storage_path) {
      throw new Error('No active, parsed, or stored resume found for the candidate.')
    }

    // Download the resume file from Supabase Storage
    await log(`Downloading resume from: ${activeResume.storage_path}`)
    const { data: resumeBlob, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(activeResume.storage_path)

    if (downloadError) {
      throw new Error(`Failed to download resume: ${downloadError.message}`)
    }
    const resumeFile = Buffer.from(await resumeBlob.arrayBuffer())
    const resumeFileName = activeResume.storage_path.split('/').pop() || 'resume.pdf'
    await log(`Resume downloaded successfully (${(resumeFile.length / 1024).toFixed(2)} KB).`)

    // For now, we only have one platform: the generic Playwright script.
    await applyToJob({
      jobUrl: application.job.source_url,
      resume: activeResume.parsed_data,
      resumeFile,
      resumeFileName,
      log,
    })

    await updateApplicationAutomationStatus(applicationId, 'submitted')
    await log('Automation process completed successfully: status set to "submitted".')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[automation] Error processing application ${applicationId}:`, errorMessage)
    // Log the failure and set the status to 'failed'
    await log(`Automation failed: ${errorMessage}`)
    await updateApplicationAutomationStatus(applicationId, 'failed')
  }
}
