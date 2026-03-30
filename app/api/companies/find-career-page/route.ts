import { NextResponse } from 'next/server'
import { findCareerPage } from '@/lib/ai/find-career-page'

export async function POST(request: Request) {
  // TODO: Implement authentication/authorization for this endpoint
  // Only authorized users or internal services should be able to trigger this.

  let companyName: string | undefined

  try {
    const body = await request.json()
    companyName = body.companyName

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 })
    }

    const result = await findCareerPage(companyName)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error finding career page for ${companyName || 'unknown'}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to find career page: ${errorMessage}` }, { status: 500 })
  }
}
