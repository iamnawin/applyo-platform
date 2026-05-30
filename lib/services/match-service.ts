import { upsertApplication } from '@/lib/db/applications'
import type { Application } from '@/lib/types'
import { getSuggestedJobsForCandidate } from './basic-matching'

export async function generateMatchesForCandidate(candidateId: string): Promise<Application[]> {
  const suggestions = await getSuggestedJobsForCandidate(candidateId, 20)
  const results: Application[] = []

  for (const suggestion of suggestions) {
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
