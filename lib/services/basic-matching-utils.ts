import type { Job, ParsedResume, Preference } from '@/lib/types'

export interface SuggestedJobScore {
  score: number
  reasons: string[]
}

export interface SuggestedJobLike {
  job: Job
  score: number
  reasons: string[]
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase()
}

function uniqueClean(values: Array<string | null | undefined>, limit = 12): string[] {
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

function includesAny(text: string, values: string[]) {
  const normalized = text.toLowerCase()
  return values.some(value => normalized.includes(value.toLowerCase()))
}

function hasSalesforceResumeSignal(resume: ParsedResume): boolean {
  const resumeText = [
    resume.summary,
    ...(resume.skills ?? []),
    ...(resume.experience ?? []).flatMap(experience => [experience.title, experience.description]),
  ].filter(Boolean).join(' ').toLowerCase()

  return resumeText.includes('salesforce')
}

function overlapCount(source: string[], targetText: string): number {
  const normalizedTarget = targetText.toLowerCase()
  return uniqueClean(source).filter(value => normalizedTarget.includes(value.toLowerCase())).length
}

export function resumeRoleSignals(resume: ParsedResume, preferences: Preference | null): string[] {
  return uniqueClean([
    ...(preferences?.desired_job_titles ?? []),
    ...(preferences?.desired_roles ?? []),
    ...(resume.experience ?? []).map(experience => experience.title),
    resume.summary?.match(/\b(?:salesforce|business analyst|data analyst|product manager|frontend|backend|full stack)\b/gi)?.join(' '),
  ], 10)
}

export function scoreJobForResume(
  resume: ParsedResume,
  preferences: Preference | null,
  job: Job,
  candidateLocation?: string | null,
): SuggestedJobScore {
  const reasons: string[] = []
  let score = 0

  const jobText = `${job.normalized_data.title} ${job.raw_description} ${(job.normalized_data.skills ?? []).join(' ')}`.toLowerCase()
  const roleSignals = resumeRoleSignals(resume, preferences)
  const skillMatches = overlapCount(resume.skills ?? [], jobText)

  if (roleSignals.length && includesAny(jobText, roleSignals)) {
    score += 55
    reasons.push('Matches resume role')
  }

  if (score === 0 && hasSalesforceResumeSignal(resume) && jobText.includes('salesforce')) {
    score += 55
    reasons.push('Matches resume role')
  }

  if (skillMatches >= 3) {
    score += 35
    reasons.push('Matches resume skills')
  } else if (skillMatches > 0) {
    score += 10 * skillMatches
    reasons.push('Some skill overlap')
  }

  if (preferences?.preferred_locations?.length && includesAny(job.normalized_data.location ?? '', preferences.preferred_locations)) {
    score += 10
    reasons.push('Matches preferred location')
  } else if (candidateLocation && normalize(job.normalized_data.location).includes(candidateLocation.toLowerCase())) {
    score += 5
    reasons.push('Near candidate location')
  }

  if (preferences?.job_types?.length && job.normalized_data.type && preferences.job_types.includes(job.normalized_data.type)) {
    score += 10
    reasons.push('Matches preferred job type')
  }

  return {
    score: Math.min(score, 100),
    reasons,
  }
}

function suggestionDedupeKey(job: Job): string {
  const sourceUrl = job.source_url?.trim().toLowerCase()
  if (sourceUrl) return `url:${sourceUrl}`

  return [
    job.normalized_data.title,
    job.normalized_data.company,
    job.normalized_data.location,
  ]
    .map(value => value?.trim().toLowerCase())
    .filter(Boolean)
    .join('|')
}

export function dedupeSuggestedJobs<T extends SuggestedJobLike>(
  suggestions: T[],
  handledJobIds = new Set<string>(),
): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const suggestion of suggestions) {
    const key = suggestionDedupeKey(suggestion.job)
    if (handledJobIds.has(suggestion.job.id)) {
      if (key) seen.add(key)
      continue
    }
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(suggestion)
  }

  return result
}
