import { NextRequest, NextResponse } from 'next/server'

// GET /api/preferences — get current user preferences
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// POST /api/preferences — save candidate preferences
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
