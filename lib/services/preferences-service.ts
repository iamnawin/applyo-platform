import type { ParsedResume, Preference } from '@/lib/types'

const DEFAULT_JOB_TYPES: Preference['job_types'] = ['full-time', 'remote']

function uniqueClean(values: Array<string | null | undefined>, limit = 10): string[] {
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

function optionalClean(value: string | null | undefined): string | undefined {
  const cleaned = value?.trim()
  return cleaned || undefined
}

function inferRolesFromResume(parsedData: ParsedResume): string[] {
  const text = [
    parsedData.summary,
    ...(parsedData.skills ?? []),
    ...(parsedData.experience ?? []).flatMap(experience => [experience.title, experience.description]),
  ].filter(Boolean).join(' ').toLowerCase()

  const roles: string[] = []
  if (text.includes('salesforce') && (
    text.includes('business analyst') ||
    text.includes('requirements') ||
    text.includes('user stories') ||
    text.includes('uat') ||
    text.includes('crm')
  )) {
    roles.push('Salesforce Business Analyst')
  }
  if (text.includes('salesforce') && (
    text.includes('administration') ||
    text.includes('administrator') ||
    text.includes('implementation') ||
    text.includes('configuration')
  )) {
    roles.push('Salesforce Administrator')
  }
  if (!roles.length && text.includes('business analyst')) roles.push('Business Analyst')

  return roles
}

function clampDailyLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 10
  return Math.min(Math.max(Math.trunc(value ?? 10), 1), 50)
}

export function buildPreferencesFromResume(
  parsedData: ParsedResume,
  candidateId: string,
): Partial<Preference> & { candidate_id: string } {
  const titles = uniqueClean((parsedData.experience ?? []).map(experience => experience.title), 5)
  const inferredTitles = titles.length ? titles : inferRolesFromResume(parsedData)
  const locations = uniqueClean([parsedData.location], 3)

  return {
    candidate_id: candidateId,
    desired_roles: inferredTitles,
    desired_job_titles: inferredTitles,
    preferred_locations: locations,
    job_types: DEFAULT_JOB_TYPES,
    max_applications_per_day: 10,
    blacklisted_companies: [],
    notify_on_match: true,
    target_companies: [],
    preferred_industries: [],
  }
}

export function normalizePreferencePayload(input: Omit<Preference, 'candidate_id'>): Omit<Preference, 'candidate_id'> {
  return {
    desired_roles: uniqueClean(input.desired_roles ?? []),
    preferred_locations: uniqueClean(input.preferred_locations ?? []),
    job_types: uniqueClean(input.job_types ?? []) as Preference['job_types'],
    min_salary: input.min_salary,
    max_applications_per_day: clampDailyLimit(input.max_applications_per_day),
    blacklisted_companies: uniqueClean(input.blacklisted_companies ?? []),
    notify_on_match: input.notify_on_match ?? true,
    target_companies: uniqueClean(input.target_companies ?? []),
    preferred_industries: uniqueClean(input.preferred_industries ?? []),
    work_authorization: optionalClean(input.work_authorization),
    desired_salary_currency: optionalClean(input.desired_salary_currency),
    desired_job_titles: uniqueClean(input.desired_job_titles ?? []),
  }
}

export function buildLegacyPreferencePayload<T extends Partial<Preference> & { candidate_id: string }>(input: T) {
  return {
    candidate_id: input.candidate_id,
    desired_roles: uniqueClean(input.desired_roles ?? []),
    preferred_locations: uniqueClean(input.preferred_locations ?? []),
    job_types: uniqueClean(input.job_types ?? []) as Preference['job_types'],
    min_salary: input.min_salary,
    max_applications_per_day: clampDailyLimit(input.max_applications_per_day),
    blacklisted_companies: uniqueClean(input.blacklisted_companies ?? []),
    notify_on_match: input.notify_on_match ?? true,
  }
}
