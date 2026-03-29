import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuggestedJobsForUser } from '@/lib/services/basic-matching'

// GET /api/matches — return basic rule-based job suggestions for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const matches = await getSuggestedJobsForUser(user.id)
    return NextResponse.json(matches)
  } catch (err) {
    console.error('List matches error:', err)
    return NextResponse.json({ error: 'Failed to fetch suggested jobs' }, { status: 500 })
  }
}
