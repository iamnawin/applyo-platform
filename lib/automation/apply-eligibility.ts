interface ApplyEligibilityInput {
  browserConfigured: boolean
  sourceUrl?: string | null
  source?: string | null
}

interface ApplicationDisplayStatusInput {
  status: string
  automation_status?: string | null
  job?: {
    source?: string | null
    source_url?: string | null
  } | null
}

export function getManualApplyReason(input: ApplyEligibilityInput): string | null {
  const url = input.sourceUrl?.toLowerCase() ?? ''
  const source = input.source?.toLowerCase() ?? ''

  if (!input.browserConfigured) {
    return 'Browser automation is not configured.'
  }

  if (!url) {
    return 'This job has no source URL.'
  }

  if (
    source === 'resume-fallback' ||
    url.includes('/jobs/search') ||
    url.includes('indeed.com/jobs?')
  ) {
    return 'This is a job search page, not a direct application page.'
  }

  return null
}

export function getApplicationDisplayStatus(application: ApplicationDisplayStatusInput): string {
  const automationStatus = application.automation_status
  const sourceUrl = application.job?.source_url?.toLowerCase() ?? ''
  const source = application.job?.source?.toLowerCase() ?? ''
  const isSearchBackedJob = source === 'resume-fallback' || sourceUrl.includes('/jobs/search') || sourceUrl.includes('indeed.com/jobs?')

  if (application.status === 'approved' && (automationStatus === 'pending' || !automationStatus) && isSearchBackedJob) {
    return 'manual'
  }

  if (automationStatus && automationStatus !== 'disabled') {
    return automationStatus
  }

  return application.status
}
