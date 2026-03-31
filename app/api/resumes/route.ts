import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'

// The monolithic POST route was removed. 
// Uploading is now handled by the chunked /step-1, /step-2, /step-3 APIs.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use the chunked /step-1, /step-2, /step-3 APIs instead.' }, 
    { status: 410 }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json([], { status: 200 })

  const resumes = await getResumesByCandidateId(candidate.id)
  return NextResponse.json(resumes)
}
