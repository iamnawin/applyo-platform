import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { createServerClient } from '@/lib/db/client'
import { upsertApplication } from '@/lib/db/applications'
import { triggerApply } from '@/lib/automation' // Import triggerApply
import { z } from 'zod'

// GET /api/approvals — list pending applications for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json([], { status: 200 })

  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('candidate_id', candidate.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

const actionSchema = z.object({
  application_id: z.string().uuid(),
  action: z.enum(['approved', 'skipped']),
  generated_cover_letter: z.string().optional(), // Added generated_cover_letter
})

// POST /api/approvals — approve or skip a pending match
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { application_id, action, generated_cover_letter } = parsed.data // Destructure generated_cover_letter

  const db = createServerClient()
  const { data: app, error: fetchError } = await db
    .from('applications')
    .select('id, candidate_id, job_id')
    .eq('id', application_id)
    .eq('candidate_id', candidate.id)
    .single()

  if (fetchError || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const updated = await upsertApplication({
    candidate_id: candidate.id,
    job_id: app.job_id,
    status: action,
  })

  // If approved, trigger the internal automation service
  if (action === 'approved') {
    // Fire-and-forget to automation service — bot failures are silent
    triggerApply(updated.id, generated_cover_letter).catch(err => { // Pass generated_cover_letter
      console.error(`Failed to trigger automation for application ${updated.id}:`, err)
    })
  }

  return NextResponse.json(updated)
}
