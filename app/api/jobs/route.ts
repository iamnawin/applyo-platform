import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyByUserId } from '@/lib/db/companies'
import { listJobsByCompany } from '@/lib/db/jobs'
import { postManualJob } from '@/lib/services/company-service'
import { z } from 'zod'

const postJobSchema = z.object({
  title: z.string().min(2, 'Job title is required'),
  company: z.string().min(2, 'Company name is required'),
  location: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'remote']).optional(),
  description: z.string().min(50, 'Job description must be at least 50 characters'),
  skills: z.array(z.string()).default([]),
  source: z.string().default('manual'),
  source_url: z.string().url().optional().or(z.literal('')),
})

// POST /api/jobs — HR posts a manual job
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postJobSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const company = await getCompanyByUserId(user.id)
  if (!company) return NextResponse.json({ error: 'Company profile not found. Please contact support.' }, { status: 404 })

  try {
    const job = await postManualJob(
      {
        ...parsed.data,
        source_url: parsed.data.source_url || undefined,
      },
      company.id,
    )
    return NextResponse.json(job, { status: 201 })
  } catch (err) {
    console.error('Manual job create error:', err)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

// GET /api/jobs — list jobs posted by the authenticated company
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getCompanyByUserId(user.id)
  if (!company) return NextResponse.json([], { status: 200 })

  try {
    const jobs = await listJobsByCompany(company.id)
    return NextResponse.json(jobs)
  } catch (err) {
    console.error('List jobs error:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
