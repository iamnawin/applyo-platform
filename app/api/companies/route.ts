import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyByUserId } from '@/lib/db/companies'
import { listCandidatesForCompany } from '@/lib/db/applications'

// GET /api/companies/candidates — scored candidates for the company's jobs
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getCompanyByUserId(user.id)
  if (!company) return NextResponse.json([], { status: 200 })

  try {
    const candidates = await listCandidatesForCompany(company.id)
    return NextResponse.json(candidates)
  } catch (err) {
    console.error('List candidates error:', err)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}

// POST /api/companies — register a company profile
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, website } = body
  if (!name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })

  const { registerCompany } = await import('@/lib/services/company-service')
  try {
    const company = await registerCompany(user.id, name, website)
    return NextResponse.json(company, { status: 201 })
  } catch (err) {
    console.error('Register company error:', err)
    return NextResponse.json({ error: 'Failed to register company' }, { status: 500 })
  }
}
