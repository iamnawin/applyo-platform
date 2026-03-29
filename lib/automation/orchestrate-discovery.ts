import { findCareerPage } from '@/lib/ai/find-career-page'
import { detectATS } from '@/lib/ai/detect-ats'
import { scrapeGreenhouseBoard } from './platforms/greenhouse-scraper'
import { scrapeIndeedBoard } from './platforms/indeed-scraper'
// import { scrapeGenericBoard } from './platforms/generic-scraper' // Future: generic scraper

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
      // Indeed scraper expects a search URL, not a career page URL.
      // This would require a more sophisticated approach to generate an Indeed search URL for the company.
      // For now, we'll log a warning and skip.
      console.warn(`[Discovery Orchestrator] Indeed ATS detected, but direct scraping from career page is not supported yet. Skipping.`)
      return `Indeed ATS detected for ${companyName}, but direct scraping from career page is not supported yet.`
    // case 'lever': // Future: Implement Lever scraper
    //   console.log(`[Discovery Orchestrator] Triggering Lever scraper for ${companyName}.`)
    //   await scrapeLeverBoard(careerPageResult.career_page_url)
    //   return `Successfully initiated Lever scraping for ${companyName}.`
    case 'other':
    case null:
    default:
      console.warn(`[Discovery Orchestrator] Unknown or generic ATS detected for ${companyName}. Falling back to generic scraping (if implemented).`)
      // await scrapeGenericBoard(careerPageResult.career_page_url) // Future
      return `Unknown or generic ATS detected for ${companyName}. Generic scraping not yet implemented.`
  }
}
