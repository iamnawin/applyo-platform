import { getCandidateByUserId } from '@/lib/db/candidates'
import { listJobs } from '@/lib/db/jobs'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'
import type { Job } from '@/lib/types'

export interface SuggestedJob {
  job: Job
  score: number
  reasons: string[]
}

function includesAny(text: string, values: string[]) {
  const normalized = text.toLowerCase()
  return values.some(value => normalized.includes(value.toLowerCase()))
}

export async function getSuggestedJobsForUser(userId: string): Promise<SuggestedJob[]> {
  const candidate = await getCandidateByUserId(userId)
  if (!candidate) return []

  const preferences = await getPreferencesByCandidateId(candidate.id)
  const jobs = await listJobs(100)

  return jobs
    .filter(job => {
      if (!preferences?.blacklisted_companies?.length) return true
      return !preferences.blacklisted_companies.some(company =>
        job.normalized_data.company.toLowerCase().includes(company.toLowerCase()),
      )
    })
    .map(job => {
      let score = 20
      const reasons: string[] = []
      const haystack = `${job.normalized_data.title} ${job.raw_description} ${job.normalized_data.skills.join(' ')}`.toLowerCase()

      if (preferences?.desired_roles?.length && includesAny(haystack, preferences.desired_roles)) {
        score += 35
        reasons.push('Matches desired roles')
      }

      if (preferences?.preferred_locations?.length && includesAny(job.normalized_data.location ?? '', preferences.preferred_locations)) {
        score += 20
        reasons.push('Matches preferred location')
      }

      if (preferences?.job_types?.length && job.normalized_data.type && preferences.job_types.includes(job.normalized_data.type)) {
        score += 15
        reasons.push('Matches preferred job type')
      }

      if (candidate.location && job.normalized_data.location?.toLowerCase().includes(candidate.location.toLowerCase())) {
        score += 10
        reasons.push('Near candidate location')
      }

      if (job.normalized_data.skills.length > 0) {
        score += 10
        reasons.push('Has structured skills')
      }

      return {
        job,
        score: Math.min(score, 100),
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}
