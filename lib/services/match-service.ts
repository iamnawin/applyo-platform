import { upsertApplication } from '@/lib/db/applications'
import { createServerClient } from '@/lib/db/client'
import type { Application } from '@/lib/types'
import { getSuggestedJobsForCandidate } from './basic-matching'

export async function generateMatchesForCandidate(candidateId: string): Promise<Application[]> {
  const db = createServerClient()

  // Fetch ALL existing application job_ids to avoid re-creating handled ones
  const { data: existing } = await db
    .from('applications')
    .select('job_id, status')
    .eq('candidate_id', candidateId)
  const handledJobIds = new Set(
    (existing ?? [])
      .filter(a => a.status !== 'pending')
      .map(a => a.job_id)
      .filter(Boolean),
  )

  const suggestions = await getSuggestedJobsForCandidate(candidateId, 20)
  const results: Application[] = []

  for (const suggestion of suggestions) {
    // Never re-create an application for a job the candidate already acted on
    if (handledJobIds.has(suggestion.job.id)) continue

    const app = await upsertApplication({
      candidate_id: candidateId,
      job_id: suggestion.job.id,
      match_score: suggestion.score / 100,
      match_reasons: suggestion.reasons,
      status: 'pending',
      applied_at: null,
    })
    results.push(app)
  }

  return results
}
