import { chromium } from 'playwright'
import { createJob } from '@/lib/db/jobs'
import { normalizeJob } from '@/lib/ai/normalize-job'

/**
 * Scrapes job postings from LinkedIn's public job search.
 * @param companyName The name of the company to search jobs for.
 */
export async function scrapeLinkedInJobs(companyName: string): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  })
  const page = await context.newPage()

  try {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(companyName)}`
    console.log(`[LinkedIn Scraper] Navigating to LinkedIn job search: ${searchUrl}`)
    
    // LinkedIn might throw auth walls or captchas; best effort parsing
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for the job list to populate
    try {
      await page.waitForSelector('ul.jobs-search__results-list li', { timeout: 15000 })
    } catch (e) {
      console.warn(`[LinkedIn Scraper] No jobs found or blocked by auth wall for ${companyName}.`)
      return
    }

    // Extract job cards
    const jobCards = await page.$$eval('ul.jobs-search__results-list li', (items) => {
      return items.map(item => {
        const titleEl = item.querySelector('h3.base-search-card__title') as HTMLElement
        const linkEl = item.querySelector('a.base-card__full-link') as HTMLAnchorElement
        return {
          title: titleEl?.innerText.trim(),
          link: linkEl?.href
        }
      }).filter(job => job.title && job.link)
    })

    console.log(`[LinkedIn Scraper] Found ${jobCards.length} jobs for ${companyName} on page 1.`)

    // We take a small subset to prevent heavy rate-limiting
    const maxJobsToScrape = Math.min(jobCards.length, 5)

    for (let i = 0; i < maxJobsToScrape; i++) {
      const job = jobCards[i]
      try {
        console.log(`[LinkedIn Scraper] Fetching description for: ${job.title}`)
        await page.goto(job.link!, { waitUntil: 'domcontentloaded', timeout: 30000 })
        
        // Try to click "Show more" if it exists to load full description
        const showMoreBtn = page.locator('button.show-more-less-html__button')
        if (await showMoreBtn.count() > 0) {
          await showMoreBtn.click().catch(() => {})
        }

        const descLocator = page.locator('.show-more-less-html__markup, .description__text')
        const rawDescription = await descLocator.first().textContent().catch(() => null)

        if (rawDescription) {
          const normalizedData = await normalizeJob(rawDescription)

          await createJob({
            company_id: null,
            raw_description: rawDescription,
            normalized_data: normalizedData,
            embedding: null,
            status: 'active',
            source: 'linkedin',
            source_url: job.link!,
          })
          console.log(`[LinkedIn Scraper] Stored job: ${job.title}`)
        } else {
          console.warn(`[LinkedIn Scraper] Could not extract description for job: ${job.link}`)
        }
      } catch (jobError) {
        console.error(`[LinkedIn Scraper] Error scraping individual job ${job.link}:`, jobError)
      }
    }
  } catch (error) {
    console.error(`[LinkedIn Scraper] Fatal error scraping LinkedIn for ${companyName}:`, error)
  } finally {
    await browser.close()
    console.log('[LinkedIn Scraper] Browser closed.')
  }
}
