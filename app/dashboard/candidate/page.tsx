import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { CandidateDashboardClient } from './CandidateDashboardClient'

export default async function CandidateDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const candidate = await getCandidateByUserId(user.id)
  const resumes = candidate ? await getResumesByCandidateId(candidate.id) : []

  return (
    <CandidateDashboardClient
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '' }}
      candidate={candidate}
      initialResumes={resumes}
    />
  )
}
