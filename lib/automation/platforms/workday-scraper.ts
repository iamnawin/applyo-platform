import { chromium } from 'playwright'
import { createJob } from '@/lib/db/jobs'
import { normalizeJob } from '@/lib/ai/normalize-job'

/**
 * Scrapes active job postings from a given Workday career page URL.
 * Workday relies heavily on dynamic loading (React/SPA), so we wait for specific selectors.
 * @param boardUrl The URL of the Workday job board (e.g., https://company.myworkdayjobs.com/en-US/careers)
 */
export async function scrapeWorkdayBoard(boardUrl: string): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log(`[Workday Scraper] Navigating to Workday board: ${boardUrl}`)
    await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 60000 })

    // Workday tends to load job listings dynamically. 
    // Usually job links contain '/job/' in their href.
    // Wait until at least one job link is visible or timeout.
    try {
      await page.waitForSelector('a[href*="/job/"]', { timeout: 15000 })
    } catch (e) {
      console.warn(`[Workday Scraper] Timeout waiting for job links on ${boardUrl}. Possibly no jobs found or different structure.`)
    }

    // Extract all hrefs that look like job postings
    const jobLinks = await page.$$eval('a[href*="/job/"]', (anchors: HTMLAnchorElement[]) => {
      // Return absolute URLs to avoid relative path issues later
      return anchors.map(a => a.href).filter((value, index, self) => self.indexOf(value) === index);
    })

    console.log(`[Workday Scraper] Found ${jobLinks.length} unique job links.`)

    for (const jobLink of jobLinks) {
      try {
        console.log(`[Workday Scraper] Navigating to job: ${jobLink}`)
        await page.goto(jobLink, { waitUntil: 'networkidle', timeout: 30000 })

        // Workday typically puts the job title in an h2 or h1 with specific data attributes or classes
        // E.g. h2[data-automation-id="jobPostingHeader"]
        const titleLocator = page.locator('h1, h2[data-automation-id="jobPostingHeader"]')
        await titleLocator.first().waitFor({ timeout: 10000 }).catch(() => null)
        const jobTitle = await titleLocator.first().textContent().catch(() => null)

        // The job description is often in a specific div
        // E.g. div[data-automation-id="jobPostingDescription"]
        const descLocator = page.locator('div[data-automation-id="jobPostingDescription"], .job-description')
        const rawDescription = await descLocator.first().textContent().catch(() => null)

        if (rawDescription && jobTitle) {
          console.log(`[Workday Scraper] Scraped job: ${jobTitle.trim()} from ${jobLink}`)

          const normalizedData = await normalizeJob(rawDescription)

          await createJob({
            company_id: null, // Resolving or creating companies happens elsewhere or later
            raw_description: rawDescription,
            normalized_data: normalizedData,
            embedding: null, // Will be generated downstream
            status: 'active',
            source: 'workday',
            source_url: jobLink,
          })
          console.log(`[Workday Scraper] Stored job: ${jobTitle.trim()}`)
        } else {
          console.warn(`[Workday Scraper] Could not extract description or title for job: ${jobLink}`)
        }
      } catch (jobError) {
        console.error(`[Workday Scraper] Error scraping individual job ${jobLink}:`, jobError)
      }
    }
  } catch (error) {
    console.error(`[Workday Scraper] Fatal error scraping Workday board ${boardUrl}:`, error)
  } finally {
    await browser.close()
    console.log('[Workday Scraper] Browser closed.')
  }
}
