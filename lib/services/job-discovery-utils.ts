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

export function shouldUseImmediateFallback(queries: DiscoveryQuery[]): boolean {
  return queries.some(query => {
    const keyword = query.keyword.toLowerCase()
    return keyword.includes('salesforce') || keyword.includes('business analyst') || keyword.includes('crm')
  })
}

function searchUrl(keyword: string, location: string, source: 'linkedin' | 'indeed') {
  const q = encodeURIComponent(keyword)
  const l = encodeURIComponent(location)
  if (source === 'linkedin') return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`
  return `https://www.indeed.com/jobs?q=${q}&l=${l}`
}

function fallbackTitleVariants(role: string): string[] {
  const lowerRole = role.toLowerCase()
  if (lowerRole.includes('salesforce') || lowerRole.includes('crm')) {
    const isCleanRole = role.length <= 45 && role.split(/\s+/).length <= 5
    return [
      ...(isCleanRole ? [role] : []),
      'Salesforce Business Analyst',
      'Salesforce Administrator',
      'Salesforce Functional Consultant',
      'Salesforce Consultant',
      'Salesforce CRM Analyst',
      'CRM Business Analyst',
      'Salesforce Implementation Analyst',
      'Salesforce Product Analyst',
      'Salesforce BA',
      'Sales Cloud Business Analyst',
      'Service Cloud Business Analyst',
      'Salesforce Requirements Analyst',
      'Salesforce UAT Analyst',
      'Salesforce Healthcare Business Analyst',
      'Salesforce Life Sciences Business Analyst',
      'Salesforce Agile Business Analyst',
      'Salesforce Business Systems Analyst',
      'Salesforce Configuration Analyst',
      'Salesforce Support Analyst',
      'Junior Salesforce Business Analyst',
    ]
  }

  if (lowerRole.includes('business analyst')) {
    return [
      role,
      'Business Analyst',
      'Business Systems Analyst',
      'Product Business Analyst',
      'Agile Business Analyst',
      'Requirements Analyst',
      'UAT Analyst',
      'CRM Business Analyst',
    ]
  }

  return [
    role,
    `${role} Consultant`,
    `${role} Analyst`,
  ]
}

export function buildResumeTargetedFallbackJobs(queries: DiscoveryQuery[], target = TARGET_JOB_COUNT): DiscoveredJobCandidate[] {
  const roles = uniqueClean(queries.map(query => query.keyword).filter(keyword => !keyword.toLowerCase().includes('software engineer')), 8)
  const location = queries[0]?.location || 'Remote'
  const items: DiscoveredJobCandidate[] = []

  for (const role of roles) {
    for (const title of uniqueClean(fallbackTitleVariants(role), target)) {
      if (items.length >= target) break
      const source = items.length % 2 === 0 ? 'linkedin' : 'indeed'
      items.push({
        source: 'resume-fallback',
        sourceUrl: searchUrl(title, location, source),
        raw: [
          title,
          source === 'linkedin' ? 'LinkedIn Jobs Search' : 'Indeed Jobs Search',
          location,
          `Resume-targeted ${title} opportunities. Open the source link to review current postings before applying.`,
          `Skills: Salesforce, CRM, Business Analysis, Requirements Gathering, User Stories, UAT, Jira, Agile`,
        ].join('\n'),
      })
    }
  }

  return items
}
