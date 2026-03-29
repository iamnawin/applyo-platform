import { NextResponse } from 'next/server'
import { detectATS } from '@/lib/ai/detect-ats'

export async function POST(request: Request) {
  // TODO: Implement authentication/authorization for this endpoint
  // Only authorized users or internal services should be able to trigger this.

  try {
    const { careerPageUrl } = await request.json()

    if (!careerPageUrl) {
      return NextResponse.json({ error: 'careerPageUrl is required' }, { status: 400 })
    }

    const result = await detectATS(careerPageUrl)

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error detecting ATS for ${careerPageUrl}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to detect ATS: ${errorMessage}` }, { status: 500 })
  }
}
