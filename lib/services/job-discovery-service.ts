/**
 * Job Discovery Service — finds live job postings via Serper (Google Search API).
 * Uses candidate preferences to build search queries, fetches results,
 * normalizes via FreeLLMAPI, and stores in the jobs table.
 */

import { createJob } from '@/lib/db/jobs'
import { runStructuredTextTask } from '@/lib/ai/providers'
import { normalizedJobSchema } from '@/lib/schemas/job'
import type { Preference } from '@/lib/types'

interface SerperResult {
  title: string
  link: string
  snippet: string
}

async function searchSerper(query: string, num = 10): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('SERPER_API_KEY not configured')

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num }),
  })

  if (!res.ok) throw new Error(`Serper API error: ${res.status}`)

  const data = await res.json() as { organic?: SerperResult[] }
  return data.organic ?? []
}

function buildSearchQuery(preferences: Preference | null, resumeSkills?: string[]): string {
  const parts: string[] = []

  if (preferences?.desired_roles?.length) {
    parts.push(preferences.desired_roles[0])
  } else if (resumeSkills?.length) {
    parts.push(resumeSkills.slice(0, 3).join(' '))
  } else {
    parts.push('software engineer')
  }

  parts.push('jobs')

  if (preferences?.preferred_locations?.length) {
    parts.push(preferences.preferred_locations[0])
  }

  // Target job boards that have structured listings
  parts.push('site:greenhouse.io OR site:lever.co OR site:linkedin.com/jobs OR site:indeed.com')

  return parts.join(' ')
}

const NORMALIZE_PROMPT = `Extract structured job data from this job posting snippet. Return JSON matching this exact schema:
{
  "title": "job title string",
  "company": "company name string",
  "location": "location or remote (optional)",
  "type": "full-time" or "part-time" or "contract" or "remote" (optional),
  "skills": ["skill1", "skill2"],
  "experience_years": number or null,
  "salary_range": {"min": number, "max": number, "currency": "USD"} or null,
  "description_summary": "brief 1-2 sentence summary (optional)"
}
If a field is not available from the snippet, omit optional fields or use null/empty array.`

export interface DiscoveryResult {
  jobsFound: number
  jobsStored: number
  errors: string[]
}

export async function discoverJobs(
  candidateId: string,
  preferences: Preference | null,
  resumeSkills?: string[],
): Promise<DiscoveryResult> {
  const query = buildSearchQuery(preferences, resumeSkills)
  const results = await searchSerper(query)

  const errors: string[] = []
  let jobsStored = 0

  for (const result of results) {
    try {
      const normalized = await runStructuredTextTask({
        taskName: 'job normalization',
        systemPrompt: NORMALIZE_PROMPT,
        userContent: `Title: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}`,
        schema: normalizedJobSchema,
      })

      await createJob({
        company_id: null,
        raw_description: `${result.title}\n${result.snippet}`,
        normalized_data: normalized,
        embedding: null,
        status: 'active',
        source: 'serper_discovery',
        source_url: result.link,
      })
      jobsStored++
    } catch (err) {
      errors.push(`Failed to process: ${result.title} — ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  return { jobsFound: results.length, jobsStored, errors }
}
