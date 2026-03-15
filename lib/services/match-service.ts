import { scoreMatch } from '@/lib/ai/score-match'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { listJobs } from '@/lib/db/jobs'
import { upsertApplication } from '@/lib/db/applications'
import type { Application } from '@/lib/types'

export async function generateMatchesForCandidate(candidateId: string): Promise<Application[]> {
  const resumes = await getResumesByCandidateId(candidateId)
  if (!resumes.length) return []

  const resume = resumes[0].parsed_data
  const jobs = await listJobs()
  const results: Application[] = []

  for (const job of jobs) {
    const score = await scoreMatch(resume, job.normalized_data)
    if (score.score >= 50) {
      const app = await upsertApplication({
        candidate_id: candidateId,
        job_id: job.id,
        match_score: score.score / 100, // normalize to 0–1 for storage; UI multiplies by 100
        status: 'pending',
        applied_at: null,
      })
      results.push(app)
    }
  }

  return results
}
