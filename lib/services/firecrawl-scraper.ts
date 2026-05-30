import FirecrawlApp from '@mendable/firecrawl-js'
import { ingestJob } from './job-service'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY ?? '' })

export interface FirecrawlScrapeResult {
  ingested: number
  errors: string[]
}

/**
 * Scrape job listings from a Naukri search URL using Firecrawl.
 * Crawls the page, extracts job links, then scrapes each job page
 * and feeds it through the ingestJob pipeline.
 */
export async function scrapeNaukriJobs(
  searchUrl: string,
  limit = 10,
): Promise<FirecrawlScrapeResult> {
  const result: FirecrawlScrapeResult = { ingested: 0, errors: [] }

  // Crawl the Naukri search results page to discover job links
  const crawlResponse = await firecrawl.crawlUrl(searchUrl, {
    limit,
    includePaths: ['**/job-listings-*', '**/job/*'],
    scrapeOptions: { formats: ['markdown'] },
  })

  if (!crawlResponse.success) {
    throw new Error(`Firecrawl crawl failed: ${crawlResponse.error ?? 'unknown error'}`)
  }

  for (const page of crawlResponse.data ?? []) {
    if (!page.markdown) continue
    try {
      await ingestJob(page.markdown, 'naukri', page.metadata?.sourceURL ?? searchUrl)
      result.ingested++
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return result
}

/**
 * Scrape a single job page URL using Firecrawl and ingest it.
 */
export async function scrapeSingleJob(
  url: string,
  source = 'firecrawl',
): Promise<void> {
  const response = await firecrawl.scrapeUrl(url, { formats: ['markdown'] })
  if (!response.success) {
    throw new Error(`Firecrawl scrape failed: ${response.error ?? 'unknown error'}`)
  }
  if (!response.markdown) throw new Error('No content returned from scrape')
  await ingestJob(response.markdown, source, url)
}
