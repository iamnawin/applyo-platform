import { NextResponse } from 'next/server'
import { scrapeGreenhouseBoard } from '@/lib/automation/platforms/greenhouse-scraper'

export async function POST(request: Request) {
  // TODO: Implement authentication/authorization for this endpoint
  // Only authorized users or internal services should be able to trigger scraping.

  try {
    const { jobBoardUrl } = await request.json()

    if (!jobBoardUrl) {
      return NextResponse.json({ error: 'jobBoardUrl is required' }, { status: 400 })
    }

    // Basic validation for Greenhouse URL
    if (!jobBoardUrl.includes('boards.greenhouse.io')) {
      return NextResponse.json({ error: 'Only Greenhouse boards are supported for now.' }, { status: 400 })
    }

    await scrapeGreenhouseBoard(jobBoardUrl)

    return NextResponse.json({ message: `Successfully initiated scraping for ${jobBoardUrl}` })
  } catch (error) {
    console.error('Error in job scraping API:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to initiate job scraping: ${errorMessage}` }, { status: 500 })
  }
}
