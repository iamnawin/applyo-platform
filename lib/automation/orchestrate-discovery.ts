import { findCareerPage } from '@/lib/ai/find-career-page'
import { detectATS } from '@/lib/ai/detect-ats'
import { scrapeGreenhouseBoard } from './platforms/greenhouse-scraper'
import { scrapeLeverBoard } from './platforms/lever-scraper'
import { scrapeWorkdayBoard } from './platforms/workday-scraper'
import { scrapeLinkedInJobs } from './platforms/linkedin-scraper'
import { scrapeIndeedBoard } from './platforms/indeed-scraper'

/**
 * Orchestrates the discovery of job postings for a given company.
 * It finds the career page, detects the ATS, and then triggers the appropriate scraper.
 * @param companyName The name of the company to discover jobs for.
 */
export async function orchestrateJobDiscovery(companyName: string): Promise<string> {
  console.log(`[Discovery Orchestrator] Starting job discovery for company: ${companyName}`)

  // 1. Find the career page
  const careerPageResult = await findCareerPage(companyName)
  if (!careerPageResult.career_page_url) {
    const errorMessage = `Could not find a career page for ${companyName}. Reasoning: ${careerPageResult.reasoning}`
    console.warn(`[Discovery Orchestrator] ${errorMessage}`)
    return errorMessage
  }
  console.log(`[Discovery Orchestrator] Found career page: ${careerPageResult.career_page_url} (Confidence: ${careerPageResult.confidence_score.toFixed(2)})`)

  // 2. Detect the ATS
  const atsDetectionResult = await detectATS(careerPageResult.career_page_url)
  if (!atsDetectionResult.ats_platform) {
    const errorMessage = `Could not confidently detect ATS for ${companyName}. Reasoning: ${atsDetectionResult.reasoning}`
    console.warn(`[Discovery Orchestrator] ${errorMessage}`)
    // Fallback to generic scraping if ATS is not detected
    // await scrapeGenericBoard(careerPageResult.career_page_url) // Future
    return errorMessage
  }
  console.log(`[Discovery Orchestrator] Detected ATS: ${atsDetectionResult.ats_platform} (Confidence: ${atsDetectionResult.confidence_score.toFixed(2)})`)

  // 3. Trigger appropriate scraper
  switch (atsDetectionResult.ats_platform) {
    case 'greenhouse':
      console.log(`[Discovery Orchestrator] Triggering Greenhouse scraper for ${companyName}.`)
      await scrapeGreenhouseBoard(careerPageResult.career_page_url)
      return `Successfully initiated Greenhouse scraping for ${companyName}.`
    case 'indeed':
      console.log(`[Discovery Orchestrator] Triggering Indeed scraper for ${companyName}.`)
      await scrapeIndeedBoard(`https://www.indeed.com/jobs?q=${encodeURIComponent(companyName)}&sort=date`)
      return `Successfully initiated Indeed scraping for ${companyName}.`
    case 'lever': // Implement Lever scraper
      console.log(`[Discovery Orchestrator] Triggering Lever scraper for ${companyName}.`)
      await scrapeLeverBoard(careerPageResult.career_page_url)
      return `Successfully initiated Lever scraping for ${companyName}.`
    case 'workday': // Implement Workday scraper
      console.log(`[Discovery Orchestrator] Triggering Workday scraper for ${companyName}.`)
      await scrapeWorkdayBoard(careerPageResult.career_page_url)
      return `Successfully initiated Workday scraping for ${companyName}.`
    case 'other':
    case null:
    default:
      console.warn(`[Discovery Orchestrator] Unknown or generic ATS detected for ${companyName}. Falling back to LinkedIn scraping.`)
      await scrapeLinkedInJobs(companyName)
      return `Unknown or generic ATS detected for ${companyName}. Falling back to LinkedIn scraping.`
  }
}
