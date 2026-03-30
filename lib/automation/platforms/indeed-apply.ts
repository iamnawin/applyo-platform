import { ApplyToJobParams } from './playwright-apply'

/**
 * Applies to a job posting on Indeed.
 * Indeed often redirects to the company's career page, so this driver
 * primarily relies on the generic Playwright script.
 */
export async function applyToIndeed({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
  jobData, // Added missing parameter
}: ApplyToJobParams): Promise<void> {
  await log(`Applying to Indeed job at: ${jobUrl} (using generic Playwright script)`)
  // For now, we can call the generic playwright-apply as Indeed often redirects.
  const { applyToJob } = await import('./playwright-apply')
  await applyToJob({ jobUrl, resume, resumeFile, resumeFileName, log, generatedCoverLetter, jobData })
}
