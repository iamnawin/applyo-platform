import {
  getApplicationById,
  logToApplication,
  updateApplicationAutomationStatus,
} from '@/lib/db/applications'
import { createServerClient } from '@/lib/db/client'
import {
  getApplicationById,
  logToApplication,
  updateApplicationAutomationStatus,
} from '@/lib/db/applications'
import { createServerClient } from '@/lib/db/client'
import { applyToJob } from './platforms/playwright-apply' // Generic fallback
import { applyToGreenhouse } from './platforms/greenhouse-apply' // Greenhouse driver

/**
 * Determines the job platform from the URL.
 * @param jobUrl The URL of the job posting.
 * @returns A string identifying the platform (e.g., 'greenhouse', 'lever', 'generic').
 */
function detectPlatform(jobUrl: string): string {
  if (jobUrl.includes('boards.greenhouse.io')) {
    return 'greenhouse'
  }
  // Add more platform detections here
  // if (jobUrl.includes('jobs.lever.co')) {
  //   return 'lever'
  // }
  return 'generic'
}

/**
 * Routes an application to the correct automation platform handler.
 * This function orchestrates the entire automation process for a single application.
 */
export async function routeApply(applicationId: string, generatedCoverLetter?: string): Promise<void> { // Added generatedCoverLetter
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

    const jobUrl = application.job.source_url
    const platform = detectPlatform(jobUrl)

    await log(`Detected platform: ${platform}`)

    const applyParams = {
      jobUrl,
      resume: activeResume.parsed_data,
      resumeFile,
      resumeFileName,
      log,
      generatedCoverLetter, // Pass generatedCoverLetter
    }

    switch (platform) {
      case 'greenhouse':
        await applyToGreenhouse(applyParams)
        break
      case 'generic':
      default:
        await log('Using generic Playwright script for application.')
        await applyToJob(applyParams)
        break
    }

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
