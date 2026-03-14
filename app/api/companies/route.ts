import { NextRequest, NextResponse } from 'next/server'

// POST /api/companies/jobs — post a new job description
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// GET /api/companies/candidates — scored candidates for company's jobs
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
