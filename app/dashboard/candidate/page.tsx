import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId, upsertCandidate } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { CandidateDashboardClient } from './CandidateDashboardClient'

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
    } catch {
      // upsert failed — proceed with null; upload will surface the error
    }
  }

  const resumes = candidate ? await getResumesByCandidateId(candidate.id) : []

  return (
    <CandidateDashboardClient
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '' }}
      candidate={candidate}
      initialResumes={resumes}
    />
  )
}
