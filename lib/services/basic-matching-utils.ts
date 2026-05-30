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

function isFallbackSearchJob(job: Job): boolean {
  const company = normalize(job.normalized_data.company)
  const url = normalize(job.source_url)
  return (
    job.source === 'resume-fallback' ||
    company.includes('jobs search') ||
    url.includes('/jobs/search') ||
    url.includes('indeed.com/jobs?')
  )
}

function cleanLegacyFallbackTitle(title: string, rawDescription: string): string {
  const text = `${title} ${rawDescription}`.toLowerCase()
  const looksLikeResumeSummary =
    title.length > 70 ||
    text.includes('requirements gathering') ||
    text.includes('user stories') ||
    text.includes('healthcare & life sciences')

  if (!looksLikeResumeSummary) return title
  if (text.includes('salesforce') && text.includes('administrator')) return 'Salesforce Administrator'
  if (text.includes('salesforce')) return 'Salesforce Business Analyst'
  if (text.includes('business analyst') || text.includes('requirements')) return 'Business Analyst'
  return title
}

export function normalizeSuggestedJob(job: Job): Job {
  if (!isFallbackSearchJob(job)) return job

  const title = cleanLegacyFallbackTitle(job.normalized_data.title, job.raw_description)
  if (title === job.normalized_data.title) return job

  return {
    ...job,
    normalized_data: {
      ...job.normalized_data,
      title,
    },
  }
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

function canonicalSourceUrl(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.toLowerCase().replace(/\/+$/, '')

    if (host.includes('linkedin.com') && path.includes('/jobs/view/')) {
      return `url:${host}${path}`
    }

    if (host.includes('indeed.') && path.includes('/viewjob')) {
      const jobKey = url.searchParams.get('jk')
      return jobKey ? `url:${host}${path}?jk=${jobKey.toLowerCase()}` : `url:${host}${path}`
    }

    return `url:${host}${path}${url.search ? url.search.toLowerCase() : ''}`
  } catch {
    return `url:${sourceUrl.trim().toLowerCase().replace(/\/+$/, '')}`
  }
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
  if (isFallbackSearchJob(job)) {
    return [
      cleanLegacyFallbackTitle(job.normalized_data.title, job.raw_description),
      job.normalized_data.location,
    ]
      .map(value => value?.trim().toLowerCase())
      .filter(Boolean)
      .join('|')
  }

  const sourceUrl = job.source_url?.trim().toLowerCase()
  if (sourceUrl) return canonicalSourceUrl(sourceUrl)

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
