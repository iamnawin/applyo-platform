import test from 'node:test'
import assert from 'node:assert/strict'

import { getApplicationDisplayStatus, getManualApplyReason } from './apply-eligibility.ts'

test('getManualApplyReason requires a browser endpoint for automation', () => {
  assert.equal(
    getManualApplyReason({
      browserConfigured: false,
      sourceUrl: 'https://www.linkedin.com/jobs/view/123',
      source: 'linkedin',
    }),
    'Browser automation is not configured.',
  )
})

test('getManualApplyReason treats search fallback jobs as manual', () => {
  assert.equal(
    getManualApplyReason({
      browserConfigured: true,
      sourceUrl: 'https://www.linkedin.com/jobs/search/?keywords=Salesforce',
      source: 'resume-fallback',
    }),
    'This is a job search page, not a direct application page.',
  )
})

test('getManualApplyReason allows real job URLs when browser is configured', () => {
  assert.equal(
    getManualApplyReason({
      browserConfigured: true,
      sourceUrl: 'https://www.linkedin.com/jobs/view/123',
      source: 'linkedin',
    }),
    null,
  )
})

test('getApplicationDisplayStatus shows old queued fallback jobs as manual', () => {
  assert.equal(
    getApplicationDisplayStatus({
      status: 'approved',
      automation_status: 'pending',
      job: {
        source: 'resume-fallback',
        source_url: 'https://www.indeed.com/jobs?q=Salesforce',
      },
    }),
    'manual',
  )
})
