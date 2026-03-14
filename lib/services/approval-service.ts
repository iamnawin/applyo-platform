import { upsertApplication } from '@/lib/db/applications'
import { triggerApply } from '@/lib/automation'
import type { ApprovalAction } from '@/lib/types'

export async function processApproval(action: ApprovalAction): Promise<void> {
  if (action.action === 'approve') {
    await upsertApplication({ candidate_id: '', job_id: action.matchId, status: 'approved', applied_at: null })
    // Human in the loop: auto-apply only after explicit approval
    await triggerApply(action.matchId)
  } else if (action.action === 'skip') {
    await upsertApplication({ candidate_id: '', job_id: action.matchId, status: 'skipped', applied_at: null })
  }
  // 'modify' — TODO: re-score with modification
}
