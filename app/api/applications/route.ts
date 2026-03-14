import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { createServerClient } from '@/lib/db/client'

// GET /api/applications — application status tracker for current candidate
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
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
