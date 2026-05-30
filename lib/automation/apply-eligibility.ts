interface ApplyEligibilityInput {
  browserConfigured: boolean
  sourceUrl?: string | null
  source?: string | null
}

interface ApplicationDisplayStatusInput {
  status: string
  automation_status?: string | null
  automation_logs?: Array<{ timestamp: string; message: string }> | null
  job?: {
    source?: string | null
    source_url?: string | null
  } | null
}

function isSearchBackedSource(sourceUrl?: string | null, source?: string | null): boolean {
  const url = sourceUrl?.toLowerCase() ?? ''
  const normalizedSource = source?.toLowerCase() ?? ''
  return (
    normalizedSource === 'resume-fallback' ||
    url.includes('/jobs/search') ||
    url.includes('indeed.com/jobs?')
  )
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

  if (isSearchBackedSource(url, source)) {
    return 'This is a job search page, not a direct application page.'
  }

  return null
}

export function isAutoApplyReady(input: ApplyEligibilityInput): boolean {
  return getManualApplyReason(input) === null
}

export function getApplicationDisplayStatus(application: ApplicationDisplayStatusInput): string {
  const automationStatus = application.automation_status
  const sourceUrl = application.job?.source_url?.toLowerCase() ?? ''
  const source = application.job?.source?.toLowerCase() ?? ''
  const isSearchBackedJob = isSearchBackedSource(sourceUrl, source)

  if (application.status === 'approved' && (automationStatus === 'pending' || !automationStatus) && isSearchBackedJob) {
    return 'manual'
  }

  if (automationStatus === 'submitted') {
    return 'submitted'
  }

  if (application.status === 'applied') {
    return 'applied'
  }

  if (automationStatus && automationStatus !== 'disabled') {
    return automationStatus
  }

  return application.status
}

export function getManualReasonForApplication(application: ApplicationDisplayStatusInput): string | null {
  const loggedReason = application.automation_logs
    ?.map(entry => entry.message)
    .find(message => message.toLowerCase().startsWith('manual apply required:'))

  if (loggedReason) {
    return loggedReason.replace(/^manual apply required:\s*/i, '').trim()
  }

  if (getApplicationDisplayStatus(application) === 'manual') {
    return getManualApplyReason({
      browserConfigured: true,
      sourceUrl: application.job?.source_url,
      source: application.job?.source,
    })
  }

  return null
}
