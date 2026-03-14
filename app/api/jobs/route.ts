import { NextRequest, NextResponse } from 'next/server'

// POST /api/jobs — ingest + normalize a job description
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// GET /api/jobs — list available jobs
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
