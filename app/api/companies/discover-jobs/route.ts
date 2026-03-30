import { NextResponse } from 'next/server'
import { orchestrateJobDiscovery } from '@/lib/automation/orchestrate-discovery'

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

    const message = await orchestrateJobDiscovery(companyName)
    return NextResponse.json({ message })
  } catch (error) {
    console.error(`Error orchestrating job discovery for ${companyName || 'unknown'}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to orchestrate job discovery: ${errorMessage}` }, { status: 500 })
  }
}
