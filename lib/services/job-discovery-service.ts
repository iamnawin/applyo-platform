/**
 * Job Discovery Service — finds live job postings via Apify actors.
 * Uses candidate preferences to build search queries, runs Apify actors,
 * normalizes via AI, and stores in the jobs table.
 * Returns a graceful no-op when Apify is not configured.
 */

import type { Preference } from '@/lib/types'
import { scrapeJobsWithApify } from './apify-scraper'
import {
  buildDiscoveryQueries,
  dedupeDiscoveredJobs,
  pickTopDiscoveredJobs,
  TARGET_JOB_COUNT,
  type DiscoveredJobCandidate,
} from './job-discovery-utils'

const DISCOVERY_PLATFORMS = ['linkedin', 'indeed', 'naukri'] as const
export { buildDiscoveryQueries, dedupeDiscoveredJobs, pickTopDiscoveredJobs }
const APIFY_ACTOR_TIMEOUT_MS = 12000

export interface DiscoveryResult {
  jobsFound: number
  jobsStored: number
  errors: string[]
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function discoverJobsWithSerper(queries: ReturnType<typeof buildDiscoveryQueries>): Promise<{ items: DiscoveredJobCandidate[]; errors: string[] }> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return { items: [], errors: ['SERPER_API_KEY not configured. Search fallback skipped.'] }

  const items: DiscoveredJobCandidate[] = []
  const errors: string[] = []

  for (const query of queries.slice(0, 3)) {
    if (items.length >= TARGET_JOB_COUNT) break

    try {
      const searchQuery = `${query.keyword} ${query.location} jobs Salesforce OR Business Analyst site:linkedin.com/jobs OR site:indeed.com OR site:greenhouse.io`
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ q: searchQuery, num: 10 }),
      })
      const payload = await response.json().catch(() => null) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> } | null
      if (!response.ok) {
        errors.push(`serper: ${response.status}`)
        continue
      }

      for (const result of payload?.organic ?? []) {
        if (!result.link || !result.title) continue
        items.push({
          source: result.link.includes('linkedin.com') ? 'linkedin' : result.link.includes('indeed.com') ? 'indeed' : 'serper',
          sourceUrl: result.link,
          raw: [result.title, query.location, result.snippet ?? '', `Search query: ${query.keyword}`].filter(Boolean).join('\n'),
        })
      }
    } catch (error) {
      errors.push(`serper: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { items, errors }
}

export async function discoverJobs(
  candidateId: string,
  preferences: Preference | null,
  resumeSkills?: string[],
  resumeTitles?: string[],
): Promise<DiscoveryResult> {
  const queries = buildDiscoveryQueries(preferences, resumeSkills, resumeTitles)
  const discovered: DiscoveredJobCandidate[] = []
  const errors: string[] = []

  if (process.env.APIFY_API_TOKEN) {
    discovery:
    for (const query of queries.slice(0, 2)) {
      for (const platform of DISCOVERY_PLATFORMS) {
        if (discovered.length >= TARGET_JOB_COUNT) break discovery

        try {
          const result = await withTimeout(scrapeJobsWithApify(platform, {
            ...query,
            limit: Math.ceil(TARGET_JOB_COUNT / DISCOVERY_PLATFORMS.length),
            ingest: false,
          }), APIFY_ACTOR_TIMEOUT_MS, `${platform} discovery`)
          discovered.push(...result.items)
          errors.push(...result.errors)
        } catch (error) {
          errors.push(`${platform}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  } else {
    errors.push('APIFY_API_TOKEN not configured. Using search fallback.')
  }

  if (dedupeDiscoveredJobs(discovered).length < TARGET_JOB_COUNT) {
    const serperResult = await discoverJobsWithSerper(queries)
    discovered.push(...serperResult.items)
    errors.push(...serperResult.errors)
  }

  const selectedJobs = pickTopDiscoveredJobs(dedupeDiscoveredJobs(discovered), TARGET_JOB_COUNT)
  let jobsStored = 0

  for (const job of selectedJobs) {
    try {
      const { ingestJob } = await import('./job-service')
      await ingestJob(job.raw, job.source, job.sourceUrl)
      jobsStored++
    } catch (error) {
      errors.push(`ingest ${job.source}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    jobsFound: selectedJobs.length,
    jobsStored,
    errors,
  }
}
