import { getCandidateByUserId } from '@/lib/db/candidates'
import { listJobs } from '@/lib/db/jobs'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'
import type { Job } from '@/lib/types'
import { getLatestResumeByCandidateId } from '@/lib/db/resumes'
import { scoreJobForResume } from './basic-matching-utils'
export { scoreJobForResume }

export interface SuggestedJob {
  job: Job
  score: number
  reasons: string[]
}

export async function getSuggestedJobsForUser(userId: string): Promise<SuggestedJob[]> {
  const candidate = await getCandidateByUserId(userId)
  if (!candidate) return []
  return getSuggestedJobsForCandidate(candidate.id)
}

export async function getSuggestedJobsForCandidate(candidateId: string, limit = 20): Promise<SuggestedJob[]> {
  const { createServerClient } = await import('@/lib/db/client')
  const db = createServerClient()
  const { data: candidate, error } = await db
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single()
  if (error || !candidate) return []
  const preferences = await getPreferencesByCandidateId(candidate.id)
  const resume = await getLatestResumeByCandidateId(candidate.id)
  if (!resume || (resume.processing_status && resume.processing_status !== 'ready')) return []

  const jobs = await listJobs(200)

  return jobs
    .filter(job => {
      if (!preferences?.blacklisted_companies?.length) return true
      return !preferences.blacklisted_companies.some(company =>
        job.normalized_data.company.toLowerCase().includes(company.toLowerCase()),
      )
    })
    .map(job => {
      const { score, reasons } = scoreJobForResume(resume.parsed_data, preferences, job, candidate.location)
      return {
        job,
        score,
        reasons,
      }
    })
    .filter(suggestion => suggestion.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
