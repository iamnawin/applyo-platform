import { ApifyClient } from 'apify-client'
import { ingestJob } from './job-service'

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN ?? '' })

// Popular community actors for each platform
const ACTORS = {
  naukri: 'trakk/naukri-job-scraper',
  linkedin: 'automation-lab/linkedin-jobs-scraper',
  indeed: 'simpleapi/indeed-job-scraper',
} as const

export type ApifyPlatform = keyof typeof ACTORS

export interface ApifyScrapeOptions {
  keyword: string
  location?: string
  limit?: number
}

export interface ApifyScrapeResult {
  ingested: number
  total: number
  errors: string[]
}

// Free tier: $5/month — keep runs small to avoid burning credits
const MAX_ITEMS_PER_RUN = 10

/**
 * Run an Apify actor to scrape jobs from a platform and ingest results.
 */
export async function scrapeJobsWithApify(
  platform: ApifyPlatform,
  options: ApifyScrapeOptions,
): Promise<ApifyScrapeResult> {
  const actorId = ACTORS[platform]
  const result: ApifyScrapeResult = { ingested: 0, total: 0, errors: [] }

  const input = buildActorInput(platform, options)
  const run = await client.actor(actorId).call(input)
  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  result.total = items.length

  for (const item of items) {
    try {
      const raw = formatJobText(item)
      const source = platform
      const sourceUrl = (item.url ?? item.jobUrl ?? item.link ?? '') as string
      await ingestJob(raw, source, sourceUrl || undefined)
      result.ingested++
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return result
}

function buildActorInput(platform: ApifyPlatform, opts: ApifyScrapeOptions): Record<string, unknown> {
  const base = { maxItems: Math.min(opts.limit ?? 10, MAX_ITEMS_PER_RUN) }
  switch (platform) {
    case 'naukri':
      return { ...base, keyword: opts.keyword, location: opts.location ?? '' }
    case 'linkedin':
      return { ...base, searchKeyword: opts.keyword, location: opts.location ?? 'India' }
    case 'indeed':
      return { ...base, query: opts.keyword, location: opts.location ?? '' }
  }
}

function formatJobText(item: Record<string, unknown>): string {
  const parts = [
    item.title || item.jobTitle || '',
    item.company || item.companyName || '',
    item.location || '',
    item.salary || item.salaryRange || '',
    item.description || item.jobDescription || item.snippet || '',
    item.skills ? `Skills: ${item.skills}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}
