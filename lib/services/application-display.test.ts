import test from 'node:test'
import assert from 'node:assert/strict'

import { dedupeApplicationsForDisplay, enrichApplicationForDisplay } from './application-display.ts'

const baseJob = {
  id: 'job-1',
  company_id: null,
  raw_description: 'Salesforce Business Analyst',
  normalized_data: {
    title: 'Salesforce Business Analyst',
    company: 'LinkedIn Jobs Search',
    location: 'India',
    type: undefined,
    skills: [],
    salary_range: null,
  },
  embedding: null,
  status: 'active',
  source: 'resume-fallback',
  source_url: 'https://www.linkedin.com/jobs/search/?keywords=Salesforce',
  created_at: '',
} as any

test('enrichApplicationForDisplay exposes assisted apply metadata', () => {
  const enriched = enrichApplicationForDisplay({
    id: 'app-1',
    candidate_id: 'candidate-1',
    job_id: 'job-1',
    match_score: 0.75,
    match_reasons: null,
    automation_status: 'manual',
    automation_logs: [],
    status: 'approved',
    applied_at: null,
    created_at: '',
    job: baseJob,
  } as any, { browserConfigured: true })

  assert.equal(enriched.is_auto_apply_ready, false)
  assert.equal(enriched.manual_reason, 'This is a job search page, not a direct application page.')
  assert.equal(enriched.source_url, baseJob.source_url)
})

test('dedupeApplicationsForDisplay removes duplicate fallback rows and low-score rows', () => {
  const rows = dedupeApplicationsForDisplay([
    {
      id: 'low',
      candidate_id: 'candidate-1',
      job_id: 'job-low',
      match_score: 0.49,
      match_reasons: null,
      automation_status: 'manual',
      automation_logs: [],
      status: 'approved',
      applied_at: null,
      created_at: '',
      job: { ...baseJob, id: 'job-low' },
    },
    {
      id: 'first',
      candidate_id: 'candidate-1',
      job_id: 'job-1',
      match_score: 0.9,
      match_reasons: null,
      automation_status: 'manual',
      automation_logs: [],
      status: 'approved',
      applied_at: null,
      created_at: '',
      job: baseJob,
    },
    {
      id: 'duplicate',
      candidate_id: 'candidate-1',
      job_id: 'job-2',
      match_score: 0.89,
      match_reasons: null,
      automation_status: 'manual',
      automation_logs: [],
      status: 'approved',
      applied_at: null,
      created_at: '',
      job: {
        ...baseJob,
        id: 'job-2',
        source: 'resume-fallback',
        source_url: 'https://www.indeed.com/jobs?q=Salesforce',
        normalized_data: { ...baseJob.normalized_data, company: 'Indeed Jobs Search' },
      },
    },
  ] as any)

  assert.deepEqual(rows.map(row => row.id), ['first'])
})
