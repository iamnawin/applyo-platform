import test from 'node:test'
import assert from 'node:assert/strict'

import { parseResumeWithRegex } from './parse-resume-fallback.ts'

test('regex fallback extracts Salesforce business analyst signals', () => {
  const resume = parseResumeWithRegex(`
Test Candidate
Salesforce Business Analyst
Email: test@example.com
Location: Bengaluru, India

SUMMARY
Salesforce Business Analyst with experience in CRM, requirements gathering, user stories,
stakeholder management, UAT, Agile Scrum, Jira, SOQL, reports and dashboards.

EXPERIENCE
Salesforce Business Analyst | Cloud CRM Services
Jan 2021 - Present
Gathered business requirements, configured Salesforce Sales Cloud, managed UAT and dashboards.

SKILLS
Salesforce, Business Analysis, CRM, Requirements Gathering, User Stories, UAT, Jira, SOQL
  `)

  assert.ok(resume.skills.includes('Salesforce'))
  assert.ok(resume.skills.includes('Business Analysis'))
  assert.ok(resume.skills.includes('CRM'))
  assert.equal(resume.experience[0]?.title, 'Salesforce Business Analyst')
})
