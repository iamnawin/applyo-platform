import type { Preference } from '@/lib/types'

export const TARGET_JOB_COUNT = 20
export const MAX_DISCOVERY_QUERIES = 5

export interface DiscoveryQuery {
  keyword: string
  location: string
}

export interface DiscoveredJobCandidate {
  source: string
  sourceUrl?: string
  raw: string
}

export function uniqueClean(values: Array<string | null | undefined>, limit = 10): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const cleaned = value?.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
    if (result.length >= limit) break
  }

  return result
}

export function buildDiscoveryQueries(
  preferences: Preference | null,
  resumeSkills: string[] = [],
  resumeTitles: string[] = [],
  defaultLocation = 'India',
): DiscoveryQuery[] {
  const keywords = uniqueClean([
    ...(preferences?.desired_job_titles ?? []),
    ...(preferences?.desired_roles ?? []),
    ...resumeTitles,
    resumeSkills.slice(0, 3).join(' '),
    'software engineer',
  ], MAX_DISCOVERY_QUERIES)
  const locations = uniqueClean(preferences?.preferred_locations ?? [], 2)
  if (locations.length === 0) locations.push(defaultLocation)

  return keywords.flatMap(keyword => locations.map(location => ({ keyword, location }))).slice(0, MAX_DISCOVERY_QUERIES)
}

function fallbackDedupeKey(job: DiscoveredJobCandidate): string {
  const parts = job.raw
    .split('\n')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3)

  return parts.join('|') || job.raw.trim().toLowerCase().slice(0, 120)
}

export function dedupeDiscoveredJobs(jobs: DiscoveredJobCandidate[]): DiscoveredJobCandidate[] {
  const seen = new Set<string>()
  const deduped: DiscoveredJobCandidate[] = []

  for (const job of jobs) {
    const sourceUrl = job.sourceUrl?.trim().toLowerCase()
    const key = sourceUrl || fallbackDedupeKey(job)
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(job)
  }

  return deduped
}

export function pickTopDiscoveredJobs(jobs: DiscoveredJobCandidate[], target = TARGET_JOB_COUNT): DiscoveredJobCandidate[] {
  return jobs.slice(0, target)
}
