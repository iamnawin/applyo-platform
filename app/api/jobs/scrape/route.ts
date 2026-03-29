import { NextResponse } from 'next/server'
import { scrapeGreenhouseBoard } from '@/lib/automation/platforms/greenhouse-scraper'
import { scrapeIndeedBoard } from '@/lib/automation/platforms/indeed-scraper' // Import Indeed scraper
import { scrapeLeverBoard } from '@/lib/automation/platforms/lever-scraper' // Import Lever scraper

export async function POST(request: Request) {
  // TODO: Implement authentication/authorization for this endpoint
  // Only authorized users or internal services should be able to trigger scraping.

  try {
    const { jobBoardUrl, platform } = await request.json() // Destructure platform

    if (!jobBoardUrl || !platform) {
      return NextResponse.json({ error: 'jobBoardUrl and platform are required' }, { status: 400 })
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
