import { createServerClient } from './client'
import type { Application } from '@/lib/types'

export async function getApplicationsByCandidateId(candidateId: string): Promise<Application[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .select('*, jobs(*)')
    .eq('candidate_id', candidateId)
    .order('applied_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Application[]
}

export async function listCandidatesForCompany(companyId: string) {
  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .select('*, candidates(full_name, email, location), jobs(normalized_data, company_id)')
    .eq('jobs.company_id', companyId)
    .neq('status', 'pending')
    .order('match_score', { ascending: false })
  if (error) throw error
  return (data ?? [])
}

export async function upsertApplication(application: Partial<Application> & { candidate_id: string; job_id: string }) {
  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .upsert(application, { onConflict: 'candidate_id,job_id' })
    .select()
    .single()
  if (error) throw error
  return data as Application
}
