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

export interface DiscoveryResult {
  jobsFound: number
  jobsStored: number
  errors: string[]
}

export async function discoverJobs(
  candidateId: string,
  preferences: Preference | null,
  resumeSkills?: string[],
  resumeTitles?: string[],
): Promise<DiscoveryResult> {
  if (!process.env.APIFY_API_TOKEN) {
    return {
      jobsFound: 0,
      jobsStored: 0,
      errors: ['APIFY_API_TOKEN not configured. Discovery skipped.'],
    }
  }

  const queries = buildDiscoveryQueries(preferences, resumeSkills, resumeTitles)
  const discovered: DiscoveredJobCandidate[] = []
  const errors: string[] = []

  discovery:
  for (const query of queries) {
    for (const platform of DISCOVERY_PLATFORMS) {
      if (discovered.length >= TARGET_JOB_COUNT) break discovery

      try {
        const result = await scrapeJobsWithApify(platform, {
          ...query,
          limit: Math.ceil(TARGET_JOB_COUNT / DISCOVERY_PLATFORMS.length),
          ingest: false,
        })
        discovered.push(...result.items)
        errors.push(...result.errors)
      } catch (error) {
        errors.push(`${platform}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
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
