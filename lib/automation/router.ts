import {
  getApplicationById,
  logToApplication,
  updateApplicationAutomationStatus,
} from '@/lib/db/applications'
import { createServerClient } from '@/lib/db/client'
import { applyToJob } from './platforms/playwright-apply' // Generic fallback
import { applyToGreenhouse } from './platforms/greenhouse-apply' // Greenhouse browser driver
import { applyToIndeed } from './platforms/indeed-apply' // Indeed driver
import { applyToNaukri } from './platforms/naukri-apply' // Naukri driver
import { applyToLinkedIn } from './platforms/linkedin-apply' // LinkedIn driver
import { applyViaGreenhouseApi, isGreenhouseDirectUrl } from './platforms/greenhouse-api-apply' // Greenhouse API
import { injectSession, checkSessionValid } from './session-injector'
import { getLinkedAccounts, type Platform } from '@/lib/services/platform-accounts'
import { canApplyToday } from './rate-limiter'

/**
 * Determines the job platform from the URL.
 * @param jobUrl The URL of the job posting.
 * @returns A string identifying the platform.
 */
function detectPlatform(jobUrl: string): string {
  if (jobUrl.includes('naukri.com')) return 'naukri'
  if (jobUrl.includes('linkedin.com/jobs') || jobUrl.includes('linkedin.com/in')) return 'linkedin'
  if (jobUrl.includes('boards.greenhouse.io')) return 'greenhouse'
  if (jobUrl.includes('indeed.com')) return 'indeed'
  return 'generic'
}

/**
 * Routes an application to the correct automation platform handler.
 * This function orchestrates the entire automation process for a single application.
 * If no browser is available (no BROWSER_WS_ENDPOINT), marks as manual with a direct link.
 */
export async function routeApply(applicationId: string, generatedCoverLetter?: string): Promise<void> {
  const log = (message: string) => logToApplication(applicationId, message)
  const supabase = createServerClient()

  try {
    await log('Automation process started.')

    const application = await getApplicationById(applicationId)
    if (!application || !application.job || !application.candidate) {
      throw new Error('Application, job, or candidate data not found.')
    }

    // Rate limit check
    const quota = await canApplyToday(application.candidate_id)
    if (!quota.allowed) {
      await log(`Daily limit reached (${quota.used}/${quota.limit}). Queued for later.`)
      await updateApplicationAutomationStatus(applicationId, 'pending')
      return
    }

    if (!application.job.source_url) {
      throw new Error('Job has no source URL, cannot apply automatically.')
    }

    const jobUrl = application.job.source_url
    const activeResume = application.candidate.resumes?.find(r => !r.processing_status || r.processing_status === 'ready')
    if (!activeResume || !activeResume.parsed_data || !activeResume.storage_path) {
      throw new Error('No active, parsed, or stored resume found for the candidate.')
    }

    // Greenhouse API path — no browser needed
    if (isGreenhouseDirectUrl(jobUrl)) {
      await updateApplicationAutomationStatus(applicationId, 'in_progress')
      await log('Using Greenhouse direct API submission (no browser required)')

      const { data: resumeBlob, error: dlErr } = await supabase.storage.from('resumes').download(activeResume.storage_path)
      if (dlErr) throw new Error(`Failed to download resume: ${dlErr.message}`)
      const resumeFile = Buffer.from(await resumeBlob.arrayBuffer())

      await applyViaGreenhouseApi({
        jobUrl,
        resume: activeResume.parsed_data,
        resumeFile,
        resumeFileName: activeResume.storage_path.split('/').pop() || 'resume.pdf',
        log,
        generatedCoverLetter,
        jobData: application.job.normalized_data,
      })

      await updateApplicationAutomationStatus(applicationId, 'submitted')
      await log('Automation completed: submitted via Greenhouse API.')
      return
    }

    // Browser-based path — requires BROWSER_WS_ENDPOINT
    const hasBrowser = Boolean(process.env.BROWSER_WS_ENDPOINT)
    const platform = detectPlatform(jobUrl)
    const platformKey = (['linkedin', 'indeed', 'naukri'].includes(platform) ? platform : null) as Platform | null

    // Check if user has a linked account for this platform
    const linkedAccounts = await getLinkedAccounts(application.candidate_id)
    const hasLinkedAccount = platformKey ? linkedAccounts.some(a => a.platform === platformKey && a.status === 'active') : false

    if (!hasBrowser) {
      if (hasLinkedAccount) {
        await log(`Platform account linked for ${platform} but no browser available. Marking manual.`)
      } else {
        await log('No remote browser and no linked account. Marking as manual apply.')
      }
      await updateApplicationAutomationStatus(applicationId, 'manual')
      return
    }

    await updateApplicationAutomationStatus(applicationId, 'in_progress')

    // Download resume
    await log(`Downloading resume from: ${activeResume.storage_path}`)
    const { data: resumeBlob, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(activeResume.storage_path)
    if (downloadError) throw new Error(`Failed to download resume: ${downloadError.message}`)
    const resumeFile = Buffer.from(await resumeBlob.arrayBuffer())
    const resumeFileName = activeResume.storage_path.split('/').pop() || 'resume.pdf'
    await log(`Resume downloaded (${(resumeFile.length / 1024).toFixed(2)} KB).`)

    await log(`Detected platform: ${platform}${hasLinkedAccount ? ' (account linked)' : ''}`)

    const applyParams = {
      jobUrl,
      jobData: application.job.normalized_data,
      resume: activeResume.parsed_data,
      resumeFile,
      resumeFileName,
      log,
      generatedCoverLetter,
    }

    switch (platform) {
      case 'naukri':
        await applyToNaukri(applyParams)
        break
      case 'linkedin':
        await applyToLinkedIn(applyParams)
        break
      case 'greenhouse':
        await applyToGreenhouse(applyParams)
        break
      case 'indeed':
        await applyToIndeed(applyParams)
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
    await log(`Automation failed: ${errorMessage}`)
    await updateApplicationAutomationStatus(applicationId, 'failed')
  }
}
