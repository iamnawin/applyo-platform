interface ApplyEligibilityInput {
  browserConfigured: boolean
  sourceUrl?: string | null
  source?: string | null
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
