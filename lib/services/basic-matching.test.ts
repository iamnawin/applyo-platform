import test from 'node:test'
import assert from 'node:assert/strict'

import { scoreJobForResume } from './basic-matching-utils.ts'

const salesforceResume = {
  name: 'Test Candidate',
  skills: ['Salesforce', 'Business Analysis', 'CRM', 'Requirements Gathering', 'UAT', 'Jira'],
  experience: [
    { title: 'Salesforce Business Analyst', company: 'Cloud CRM', start: '2021', end: 'Present', description: 'Sales Cloud requirements and UAT' },
  ],
  education: [],
  languages: [],
}

test('scoreJobForResume favors Salesforce business analyst jobs', () => {
  const score = scoreJobForResume(
    salesforceResume as any,
    null,
    {
      id: '1',
      company_id: null,
      raw_description: 'Salesforce CRM requirements gathering, UAT, Jira, stakeholder management',
      normalized_data: {
        title: 'Salesforce Business Analyst',
        company: 'CRM Co',
        location: 'Remote',
        type: 'full-time',
        skills: ['Salesforce', 'CRM', 'UAT', 'Jira'],
        salary_range: null,
      },
      embedding: null,
      status: 'active',
      source: 'test',
      source_url: null,
      created_at: '',
    },
    null,
  )

  assert.ok(score.score >= 70)
  assert.ok(score.reasons.includes('Matches resume role'))
})

test('scoreJobForResume rejects unrelated engineering jobs', () => {
  const score = scoreJobForResume(
    salesforceResume as any,
    null,
    {
      id: '2',
      company_id: null,
      raw_description: 'Build React and Node.js services with PostgreSQL',
      normalized_data: {
        title: 'Senior React Developer',
        company: 'Tech Co',
        location: 'Remote',
        type: 'full-time',
        skills: ['React', 'Node.js', 'PostgreSQL'],
        salary_range: null,
      },
      embedding: null,
      status: 'active',
      source: 'test',
      source_url: null,
      created_at: '',
    },
    null,
  )

  assert.equal(score.score, 0)
})

test('scoreJobForResume accepts Salesforce fallback jobs when preferences are missing', () => {
  const score = scoreJobForResume(
    {
      name: 'SRI VANI NEMANI',
      summary: 'Salesforce Implementation & Administration, Requirements Gathering & User Stories, Healthcare & Life Sciences Domain, Agile / Iterative Delivery',
      skills: [
        'Salesforce Implementation & Administration',
        'Requirements Gathering & User Stories',
        'Healthcare & Life Sciences Domain',
        'Agile / Iterative Delivery',
      ],
      experience: [],
      education: [],
      languages: [],
    } as any,
    null,
    {
      id: '3',
      company_id: null,
      raw_description: [
        'Salesforce Functional Consultant',
        'LinkedIn Jobs Search',
        'India',
        'Resume-targeted Salesforce Functional Consultant opportunities.',
        'Skills: Salesforce, CRM, Business Analysis, Requirements Gathering, User Stories, UAT, Jira, Agile',
      ].join('\n'),
      normalized_data: {
        title: 'Salesforce Functional Consultant',
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
    },
    null,
  )

  assert.ok(score.score >= 50)
  assert.ok(score.reasons.includes('Matches resume role'))
})
