import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getApplicationDisplayStatus,
  getManualApplyReason,
  getManualReasonForApplication,
  isAutoApplyReady,
} from './apply-eligibility.ts'

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

test('isAutoApplyReady only allows direct job URLs with browser automation', () => {
  assert.equal(
    isAutoApplyReady({
      browserConfigured: true,
      sourceUrl: 'https://www.linkedin.com/jobs/view/123',
      source: 'linkedin',
    }),
    true,
  )
  assert.equal(
    isAutoApplyReady({
      browserConfigured: true,
      sourceUrl: 'https://www.linkedin.com/jobs/search/?keywords=Salesforce',
      source: 'linkedin',
    }),
    false,
  )
  assert.equal(
    isAutoApplyReady({
      browserConfigured: false,
      sourceUrl: 'https://boards.greenhouse.io/acme/jobs/123',
      source: 'greenhouse',
    }),
    false,
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

test('getApplicationDisplayStatus does not show applied until submitted or user marked applied', () => {
  assert.equal(
    getApplicationDisplayStatus({
      status: 'approved',
      automation_status: 'in_progress',
      job: {
        source: 'linkedin',
        source_url: 'https://www.linkedin.com/jobs/view/123',
      },
    }),
    'in_progress',
  )
  assert.equal(
    getApplicationDisplayStatus({
      status: 'approved',
      automation_status: 'submitted',
      job: {
        source: 'linkedin',
        source_url: 'https://www.linkedin.com/jobs/view/123',
      },
    }),
    'submitted',
  )
  assert.equal(
    getApplicationDisplayStatus({
      status: 'applied',
      automation_status: 'manual',
      job: {
        source: 'resume-fallback',
        source_url: 'https://www.indeed.com/jobs?q=Salesforce',
      },
    }),
    'applied',
  )
})

test('getManualReasonForApplication prefers automation log reason when present', () => {
  assert.equal(
    getManualReasonForApplication({
      status: 'approved',
      automation_status: 'manual',
      automation_logs: [
        { timestamp: '2026-05-30T00:00:00.000Z', message: 'Manual apply required: This is a job search page, not a direct application page.' },
      ],
      job: {
        source: 'resume-fallback',
        source_url: 'https://www.indeed.com/jobs?q=Salesforce',
      },
    }),
    'This is a job search page, not a direct application page.',
  )
})
