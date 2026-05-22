import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'
import { getLatestResumeByCandidateId } from '@/lib/db/resumes'
import { discoverJobs } from '@/lib/services/job-discovery-service'
import { generateMatchesForCandidate } from '@/lib/services/match-service'
import { sendMatchNotification } from '@/lib/services/email-service'

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get active candidates with preferences set
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, email, full_name')
    .not('id', 'is', null)
    .limit(20)

  if (!candidates?.length) {
    return NextResponse.json({ success: true, processed: 0 })
  }

  const results = []
  for (const candidate of candidates) {
    try {
      const preferences = await getPreferencesByCandidateId(candidate.id)
      if (!preferences) continue

      const resume = await getLatestResumeByCandidateId(candidate.id)
      const skills = resume?.parsed_data?.skills ?? []

      const discovery = await discoverJobs(candidate.id, preferences, skills)
      const matches = await generateMatchesForCandidate(candidate.id)

      if (matches.length > 0 && candidate.email) {
        await sendMatchNotification(candidate.email, candidate.full_name ?? '', matches.length).catch(() => {})
      }

      results.push({ candidateId: candidate.id, discovered: discovery.jobsFound, matched: matches.length })
    } catch (err) {
      console.error(`[Cron] Discovery failed for ${candidate.id}:`, err)
      results.push({ candidateId: candidate.id, error: true })
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}
