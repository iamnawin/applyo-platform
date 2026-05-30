/**
 * Job Discovery Service — finds live job postings via Apify actors.
 * Uses candidate preferences to build search queries, runs Apify actors,
 * normalizes via AI, and stores in the jobs table.
 * Falls back to Firecrawl if Apify is not configured.
 */

import { createJob } from '@/lib/db/jobs'
import { runStructuredTextTask } from '@/lib/ai/providers'
import { normalizedJobSchema } from '@/lib/schemas/job'
import type { Preference } from '@/lib/types'
import { scrapeJobsWithApify } from './apify-scraper'

function buildKeyword(preferences: Preference | null, resumeSkills?: string[]): string {
  if (preferences?.desired_roles?.length) return preferences.desired_roles[0]
  if (resumeSkills?.length) return resumeSkills.slice(0, 3).join(' ')
  return 'software engineer'
}

function buildLocation(preferences: Preference | null): string {
  if (preferences?.preferred_locations?.length) return preferences.preferred_locations[0]
  return 'India'
}

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
  const keyword = buildKeyword(preferences, resumeSkills)
  const location = buildLocation(preferences)

  // Use Apify if configured, otherwise throw helpful error
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured. Add it to your environment variables.')
  }

  const result = await scrapeJobsWithApify('naukri', { keyword, location, limit: 10 })

  return {
    jobsFound: result.total,
    jobsStored: result.ingested,
    errors: result.errors,
  }
}
