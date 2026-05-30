import type { Application, Job } from '../types'

type ApplicationWithJob = Application & { job: Job }

export type DisplayApplication = ApplicationWithJob & {
  is_auto_apply_ready: boolean
  manual_reason: string | null
  source_url: string | null
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function isSearchBackedJob(job: Job): boolean {
  const company = normalize(job.normalized_data.company)
  const url = normalize(job.source_url)
  return (
    normalize(job.source) === 'resume-fallback' ||
    company.includes('jobs search') ||
    url.includes('/jobs/search') ||
    url.includes('indeed.com/jobs?')
  )
}

function getManualApplyReason(job: Job, browserConfigured: boolean): string | null {
  if (!browserConfigured) return 'Browser automation is not configured.'
  if (!job.source_url) return 'This job has no source URL.'
  if (isSearchBackedJob(job)) return 'This is a job search page, not a direct application page.'
  return null
}

function getLoggedManualReason(application: ApplicationWithJob): string | null {
  const loggedReason = application.automation_logs
    ?.map(entry => entry.message)
    .find(message => message.toLowerCase().startsWith('manual apply required:'))

  return loggedReason ? loggedReason.replace(/^manual apply required:\s*/i, '').trim() : null
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

function applicationDedupeKey(application: ApplicationWithJob): string {
  const job = application.job
  if (isSearchBackedJob(job)) {
    return [
      cleanLegacyFallbackTitle(job.normalized_data.title, job.raw_description),
      job.normalized_data.location,
    ]
      .map(normalize)
      .filter(Boolean)
      .join('|')
  }

  if (job.source_url) return `url:${normalize(job.source_url).replace(/\/+$/, '')}`

  return [
    job.normalized_data.title,
    job.normalized_data.company,
    job.normalized_data.location,
  ]
    .map(normalize)
    .filter(Boolean)
    .join('|')
}

export function enrichApplicationForDisplay(
  application: ApplicationWithJob,
  options = { browserConfigured: false },
): DisplayApplication {
  const manualReason = getLoggedManualReason(application) ?? getManualApplyReason(application.job, options.browserConfigured)

  return {
    ...application,
    is_auto_apply_ready: manualReason === null,
    manual_reason: manualReason,
    source_url: application.job.source_url,
  }
}

export function dedupeApplicationsForDisplay<T extends ApplicationWithJob>(applications: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const application of applications) {
    if (application.match_score < 0.5) continue
    const key = applicationDedupeKey(application)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(application)
  }

  return result
}
