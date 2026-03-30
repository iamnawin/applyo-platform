import { scoreMatch } from '@/lib/ai/score-match'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { listJobs } from '@/lib/db/jobs'
import { upsertApplication } from '@/lib/db/applications'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'
import type { Application } from '@/lib/types'

export async function generateMatchesForCandidate(candidateId: string): Promise<Application[]> {
  const resumes = await getResumesByCandidateId(candidateId)
  if (!resumes.length) return []

  const activeResume = resumes.find(resume => resume.processing_status === 'ready')
  if (!activeResume) return []

  const resume = activeResume.parsed_data
  const preferences = await getPreferencesByCandidateId(candidateId)
  const jobs = await listJobs()
  const results: Application[] = []

  for (const job of jobs) {
    const score = await scoreMatch(resume, job.normalized_data, preferences || undefined)
    if (score.score >= 50) {
      // Flatten pros and cons for the simple string array in DB
      const combinedReasons = [
        ...score.pros.map(p => `✅ ${p}`),
        ...score.cons.map(c => `❌ ${c}`)
      ]

      const app = await upsertApplication({
        candidate_id: candidateId,
        job_id: job.id,
        match_score: score.score / 100, // normalize to 0–1 for storage; UI multiplies by 100
        match_reasons: combinedReasons, // Store combined formatted reasons
        status: 'pending',
        applied_at: null,
      })
      results.push(app)
    }
  }

  return results
}
