import { NextRequest, NextResponse } from 'next/server'

// GET /api/matches — return AI-scored job matches for current user
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
