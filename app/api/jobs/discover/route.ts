import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'
import { getLatestResumeByCandidateId } from '@/lib/db/resumes'
import { discoverJobs } from '@/lib/services/job-discovery-service'
import { generateMatchesForCandidate } from '@/lib/services/match-service'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = rateLimit(`discover:${user.id}`)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })
  }

  const preferences = await getPreferencesByCandidateId(candidate.id)
  const resume = await getLatestResumeByCandidateId(candidate.id)
  const resumeSkills = resume?.parsed_data?.skills ?? []

  try {
    const result = await discoverJobs(candidate.id, preferences, resumeSkills)

    // Trigger matching after discovery
    if (result.jobsStored > 0) {
      generateMatchesForCandidate(candidate.id).catch(err =>
        console.error('[discover] Match generation failed:', err)
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[discover] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Job discovery failed' },
      { status: 500 },
    )
  }
}
