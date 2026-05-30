import test from 'node:test'
import assert from 'node:assert/strict'

import { buildLegacyPreferencePayload, buildPreferencesFromResume, normalizePreferencePayload } from './preferences-service.ts'

test('buildPreferencesFromResume derives editable preferences from parsed resume', () => {
  const prefs = buildPreferencesFromResume({
    location: 'Hyderabad',
    skills: ['React', 'TypeScript'],
    experience: [
      { title: 'Senior Frontend Engineer', company: 'A', start: '2022', end: 'Present', description: '' },
      { title: 'Frontend Engineer', company: 'B', start: '2020', end: '2022', description: '' },
      { title: 'Senior Frontend Engineer', company: 'C', start: '2018', end: '2020', description: '' },
    ],
  } as any, 'candidate-1')

  assert.deepEqual(prefs.desired_roles, ['Senior Frontend Engineer', 'Frontend Engineer'])
  assert.deepEqual(prefs.desired_job_titles, ['Senior Frontend Engineer', 'Frontend Engineer'])
  assert.deepEqual(prefs.preferred_locations, ['Hyderabad'])
  assert.deepEqual(prefs.job_types, ['full-time', 'remote'])
})

test('buildPreferencesFromResume infers Salesforce BA preferences without experience titles', () => {
  const prefs = buildPreferencesFromResume({
    name: 'SRI VANI NEMANI',
    summary: 'Salesforce Implementation & Administration, Requirements Gathering & User Stories, Healthcare & Life Sciences Domain, Agile / Iterative Delivery',
    skills: ['Salesforce', 'Requirements Gathering', 'User Stories', 'CRM', 'UAT'],
    experience: [],
    education: [],
    languages: [],
  } as any, 'candidate-1')

  assert.deepEqual(prefs.desired_roles, ['Salesforce Business Analyst', 'Salesforce Administrator'])
  assert.deepEqual(prefs.desired_job_titles, ['Salesforce Business Analyst', 'Salesforce Administrator'])
})

test('normalizePreferencePayload converts empty optional strings and clamps daily limit', () => {
  const payload = normalizePreferencePayload({
    desired_roles: ['Engineer', ''],
    preferred_locations: ['Remote'],
    job_types: ['full-time', 'remote'],
    min_salary: undefined,
    max_applications_per_day: 99,
    blacklisted_companies: [],
    notify_on_match: true,
    target_companies: ['Acme'],
    preferred_industries: [],
    work_authorization: '',
    desired_salary_currency: '',
    desired_job_titles: ['Engineer'],
  })

  assert.equal(payload.max_applications_per_day, 50)
  assert.equal(payload.work_authorization, undefined)
  assert.equal(payload.desired_salary_currency, undefined)
  assert.deepEqual(payload.desired_roles, ['Engineer'])
})

test('buildLegacyPreferencePayload keeps core fields and removes newer optional columns', () => {
  const payload = buildLegacyPreferencePayload({
    candidate_id: 'candidate-1',
    desired_roles: ['Salesforce Business Analyst'],
    preferred_locations: ['Remote'],
    job_types: ['full-time'],
    min_salary: undefined,
    max_applications_per_day: 10,
    blacklisted_companies: [],
    notify_on_match: true,
    target_companies: ['Acme'],
    preferred_industries: ['Healthcare'],
    work_authorization: 'US Citizen',
    desired_salary_currency: 'USD',
    desired_job_titles: ['Salesforce Business Analyst'],
  } as any)

  assert.deepEqual(Object.keys(payload).sort(), [
    'blacklisted_companies',
    'candidate_id',
    'desired_roles',
    'job_types',
    'max_applications_per_day',
    'min_salary',
    'notify_on_match',
    'preferred_locations',
  ])
  assert.deepEqual(payload.desired_roles, ['Salesforce Business Analyst'])
})
