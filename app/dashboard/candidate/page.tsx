import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId, upsertCandidate } from '@/lib/db/candidates'
import { getPreferencesByCandidateId, upsertPreferences } from '@/lib/db/preferences'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { CandidateDashboardClient } from './CandidateDashboardClient'
import { buildPreferencesFromResume } from '@/lib/services/preferences-service'

export default async function CandidateDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Auto-create candidate row on first visit — safe upsert
  let candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    try {
      candidate = await upsertCandidate({
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        email: user.email ?? '',
      })
    } catch (err) {
      console.error('[CandidateDashboard] upsertCandidate failed:', err)
    }
  }

  const resumes = candidate ? await getResumesByCandidateId(candidate.id) : []
  let preferences = candidate ? await getPreferencesByCandidateId(candidate.id) : null
  const latestReadyResume = resumes.find(resume => !resume.processing_status || resume.processing_status === 'ready')
  if (candidate && !preferences && latestReadyResume?.parsed_data) {
    try {
      preferences = await upsertPreferences(buildPreferencesFromResume(latestReadyResume.parsed_data, candidate.id))
    } catch (err) {
      console.error('[CandidateDashboard] auto preferences failed:', err)
    }
  }

  return (
    <CandidateDashboardClient
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '' }}
      candidate={candidate}
      initialResumes={resumes}
      initialPreferences={preferences}
    />
  )
}
