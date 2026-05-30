import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { createServerClient } from '@/lib/db/client'
import { logToApplication } from '@/lib/db/applications'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const db = createServerClient()
  const { data: application, error: fetchError } = await db
    .from('applications')
    .select('id, candidate_id')
    .eq('id', params.id)
    .eq('candidate_id', candidate.id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  const update = {
    status: 'applied',
    automation_status: 'manual',
    applied_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('applications')
    .update(update)
    .eq('id', params.id)
    .eq('candidate_id', candidate.id)
    .select()
    .single()

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (!message.includes('automation_status')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: legacyData, error: legacyError } = await db
      .from('applications')
      .update({ status: update.status, applied_at: update.applied_at })
      .eq('id', params.id)
      .eq('candidate_id', candidate.id)
      .select()
      .single()

    if (legacyError) return NextResponse.json({ error: legacyError.message }, { status: 500 })
    await logToApplication(params.id, 'Candidate marked this assisted application as applied.').catch(() => {})
    return NextResponse.json({ ...legacyData, automation_status: 'manual' })
  }

  await logToApplication(params.id, 'Candidate marked this assisted application as applied.').catch(() => {})
  return NextResponse.json(data)
}
