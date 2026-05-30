import test from 'node:test'
import assert from 'node:assert/strict'

import { buildFallbackCoverLetter } from './cover-letter-fallback.ts'

test('buildFallbackCoverLetter creates usable text from job and resume context', () => {
  const letter = buildFallbackCoverLetter({
    candidateName: 'Sri Vani Nemani',
    resumeSummary: 'Salesforce Implementation & Administration, Requirements Gathering & User Stories',
    candidateSkills: ['Salesforce', 'CRM', 'UAT', 'Agile'],
    jobTitle: 'Salesforce Business Analyst',
    company: 'Acme Health',
    location: 'India',
  })

  assert.match(letter, /Dear Hiring Manager/)
  assert.match(letter, /Salesforce Business Analyst/)
  assert.match(letter, /Acme Health/)
  assert.match(letter, /Salesforce, CRM, UAT/)
  assert.match(letter, /Sri Vani Nemani/)
})

test('buildFallbackCoverLetter handles sparse fallback job data', () => {
  const letter = buildFallbackCoverLetter({
    jobTitle: 'Requirements Analyst',
    company: 'LinkedIn Jobs Search',
  })

  assert.match(letter, /Requirements Analyst/)
  assert.match(letter, /LinkedIn Jobs Search/)
  assert.doesNotMatch(letter, /undefined|null/)
})
