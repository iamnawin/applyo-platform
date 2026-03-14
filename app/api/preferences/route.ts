import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getPreferencesByCandidateId, upsertPreferences } from '@/lib/db/preferences'
import { z } from 'zod'

const preferencesSchema = z.object({
  desired_roles: z.array(z.string()).default([]),
  preferred_locations: z.array(z.string()).default([]),
  job_types: z.array(z.enum(['full-time', 'part-time', 'contract', 'remote'])).default([]),
  min_salary: z.number().optional(),
  max_applications_per_day: z.number().int().min(1).max(50).default(10),
  blacklisted_companies: z.array(z.string()).default([]),
  notify_on_match: z.boolean().default(true),
})

// GET /api/preferences — get current candidate preferences
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json(null, { status: 200 })

  const prefs = await getPreferencesByCandidateId(candidate.id)
  return NextResponse.json(prefs)
}

// POST /api/preferences — save candidate preferences
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })

  const body = await req.json()
  const parsed = preferencesSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const prefs = await upsertPreferences({ candidate_id: candidate.id, ...parsed.data })
    return NextResponse.json(prefs)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save preferences'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
