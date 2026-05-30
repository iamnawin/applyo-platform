import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDiscoveryQueries,
  shouldUseImmediateFallback,
  buildResumeTargetedFallbackJobs,
  dedupeDiscoveredJobs,
  pickTopDiscoveredJobs,
} from './job-discovery-utils.ts'

test('buildDiscoveryQueries uses resume titles, skills, preferences, and locations', () => {
  const queries = buildDiscoveryQueries(
    {
      desired_roles: ['Frontend Engineer'],
      desired_job_titles: ['React Developer'],
      preferred_locations: ['Bengaluru'],
    } as any,
    ['React', 'TypeScript', 'Node.js'],
    ['Software Engineer', 'UI Developer'],
    'India',
  )

  assert.deepEqual(queries.slice(0, 3), [
    { keyword: 'React Developer', location: 'Bengaluru' },
    { keyword: 'Frontend Engineer', location: 'Bengaluru' },
    { keyword: 'Software Engineer', location: 'Bengaluru' },
  ])
  assert.ok(queries.some(query => query.keyword === 'React TypeScript Node.js'))
})

test('dedupeDiscoveredJobs removes repeated source URLs and title/company/location duplicates', () => {
  const jobs = dedupeDiscoveredJobs([
    { source: 'linkedin', sourceUrl: 'https://example.com/jobs/1', raw: 'a' },
    { source: 'indeed', sourceUrl: 'https://example.com/jobs/1', raw: 'b' },
    { source: 'naukri', sourceUrl: '', raw: 'Frontend Engineer\nAcme\nRemote\nBuild UI' },
    { source: 'linkedin', sourceUrl: '', raw: 'frontend engineer\nacme\nremote\nDuplicate' },
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map(job => job.raw), ['a', 'Frontend Engineer\nAcme\nRemote\nBuild UI'])
})

test('pickTopDiscoveredJobs caps selected jobs at target count', () => {
  const jobs = Array.from({ length: 25 }, (_, index) => ({
    source: 'linkedin',
    sourceUrl: `https://example.com/${index}`,
    raw: `Job ${index}`,
  }))

  assert.equal(pickTopDiscoveredJobs(jobs, 20).length, 20)
})

test('buildResumeTargetedFallbackJobs creates 20 Salesforce search jobs from queries', () => {
  const jobs = buildResumeTargetedFallbackJobs([
    { keyword: 'Salesforce Implementation & Administration Requirements Gathering & User Stories Healthcare & Life Sciences Domain', location: 'Bengaluru' },
  ], 20)

  assert.equal(jobs.length, 20)
  assert.equal(jobs[0].source, 'resume-fallback')
  assert.match(jobs[0].raw, /Salesforce Business Analyst/)
  assert.doesNotMatch(jobs[0].raw.split('\n')[0], /Requirements Gathering & User Stories/)
  assert.match(jobs[0].sourceUrl ?? '', /Salesforce/)
  assert.ok(jobs.some(job => job.raw.includes('Salesforce Administrator')))
  assert.ok(jobs.some(job => job.raw.includes('CRM Business Analyst')))
})

test('shouldUseImmediateFallback identifies resume-first Salesforce discovery', () => {
  const queries = [
    { keyword: 'Salesforce Business Analyst', location: 'India' },
    { keyword: 'Salesforce Administrator', location: 'India' },
  ]

  assert.equal(shouldUseImmediateFallback(queries), true)
  assert.equal(shouldUseImmediateFallback([{ keyword: 'software engineer', location: 'India' }]), false)
})
