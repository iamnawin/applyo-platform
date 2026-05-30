import { NextResponse } from 'next/server'
import { scrapeGreenhouseBoard } from '@/lib/automation/platforms/greenhouse-scraper'
import { scrapeIndeedBoard } from '@/lib/automation/platforms/indeed-scraper'
import { scrapeLeverBoard } from '@/lib/automation/platforms/lever-scraper'
import { scrapeWorkdayBoard } from '@/lib/automation/platforms/workday-scraper'
import { scrapeNaukriJobs, scrapeSingleJob } from '@/lib/services/firecrawl-scraper'
import { scrapeJobsWithApify, type ApifyPlatform } from '@/lib/services/apify-scraper'

export async function POST(request: Request) {
  // TODO: Implement authentication/authorization for this endpoint
  // Only authorized users or internal services should be able to trigger scraping.

  try {
    const { jobBoardUrl, platform, keyword, location, limit } = await request.json()

    if (!platform) {
      return NextResponse.json({ error: 'platform is required' }, { status: 400 })
    }

    // Apify-based scraping uses keyword search, not a URL
    const apifyPlatforms: ApifyPlatform[] = ['naukri', 'linkedin', 'indeed']
    if (platform === 'apify' || (apifyPlatforms.includes(platform) && keyword)) {
      if (!keyword) {
        return NextResponse.json({ error: 'keyword is required for Apify scraping' }, { status: 400 })
      }
      const apifyTarget = platform === 'apify' ? 'naukri' : platform as ApifyPlatform
      const apifyResult = await scrapeJobsWithApify(apifyTarget, { keyword, location, limit })
      return NextResponse.json({
        message: `Apify: ingested ${apifyResult.ingested}/${apifyResult.total} jobs from ${apifyTarget}`,
        ...apifyResult,
      })
    }

    if (!jobBoardUrl) {
      return NextResponse.json({ error: 'jobBoardUrl is required' }, { status: 400 })
    }

    let message = ''
    switch (platform) {
      case 'greenhouse':
        if (!jobBoardUrl.includes('boards.greenhouse.io')) {
          return NextResponse.json({ error: 'Invalid URL for Greenhouse platform.' }, { status: 400 })
        }
        await scrapeGreenhouseBoard(jobBoardUrl)
        message = `Successfully initiated Greenhouse scraping for ${jobBoardUrl}`
        break
      case 'indeed':
        if (!jobBoardUrl.includes('indeed.com/jobs')) { // Indeed search results URL
          return NextResponse.json({ error: 'Invalid URL for Indeed platform.' }, { status: 400 })
        }
        await scrapeIndeedBoard(jobBoardUrl)
        message = `Successfully initiated Indeed scraping for ${jobBoardUrl}`
        break
      case 'lever':
        if (!jobBoardUrl.includes('jobs.lever.co')) { // Lever job board URL
          return NextResponse.json({ error: 'Invalid URL for Lever platform.' }, { status: 400 })
        }
        await scrapeLeverBoard(jobBoardUrl)
        message = `Successfully initiated Lever scraping for ${jobBoardUrl}`
        break
      case 'workday':
        if (!jobBoardUrl.includes('myworkdayjobs.com')) { // Workday job board URL
          return NextResponse.json({ error: 'Invalid URL for Workday platform. Should contain myworkdayjobs.com' }, { status: 400 })
        }
        await scrapeWorkdayBoard(jobBoardUrl)
        message = `Successfully initiated Workday scraping for ${jobBoardUrl}`
        break
      case 'naukri':
        if (!jobBoardUrl.includes('naukri.com')) {
          return NextResponse.json({ error: 'Invalid URL for Naukri platform.' }, { status: 400 })
        }
        const naukriResult = await scrapeNaukriJobs(jobBoardUrl)
        message = `Scraped ${naukriResult.ingested} jobs from Naukri`
        break
      case 'firecrawl':
        const fcResult = await scrapeSingleJob(jobBoardUrl)
        message = `Successfully scraped and ingested job from ${jobBoardUrl}`
        break
      default:
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error in job scraping API:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to initiate job scraping: ${errorMessage}` }, { status: 500 })
  }
}
