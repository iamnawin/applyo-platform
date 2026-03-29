import { updateApplicationStatus } from '@/lib/db/applications'
import { triggerApply } from '@/lib/automation'
import type { ApprovalAction } from '@/lib/types'

/**
 * Processes a candidate's approval or rejection of a job match.
 * If approved, this is the entry point for the auto-apply feature.
 */
export async function processApproval(action: ApprovalAction): Promise<void> {
  // Assuming action.matchId is the ID of the application record.
  const applicationId = action.matchId

  if (action.action === 'approve') {
    // First, mark the application as 'approved' by the user.
    await updateApplicationStatus(applicationId, 'approved')

    // Now, trigger the automation engine to apply for the job.
    // This is a fire-and-forget operation from the user's perspective.
    triggerApply(applicationId).catch(err => {
      console.error(`[ApprovalService] Triggering apply for ${applicationId} failed unexpectedly:`, err)
    })
  } else if (action.action === 'skip') {
    await updateApplicationStatus(applicationId, 'skipped')
  }
  // 'modify' action is not yet implemented.
}
