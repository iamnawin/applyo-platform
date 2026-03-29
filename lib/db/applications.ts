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

export async function upsertApplication(
  application: Partial<Application> & { candidate_id: string; job_id: string; match_reasons?: string[] | null }
) {
  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .upsert(application, { onConflict: 'candidate_id,job_id' })
    .select()
    .single()
  if (error) throw error
  return data as Application
}

export async function getApplicationById(applicationId: string): Promise<Application | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .select('*, job:jobs(*), candidate:candidates(*, resumes(*))')
    .eq('id', applicationId)
    .single()

  if (error) {
    console.error('Error fetching application by ID:', error)
    return null
  }
  // The type from the join is complex, so we cast.
  // Ensure you handle the nested structures correctly in the calling code.
  return data as unknown as Application
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'approved' | 'skipped' | 'applied' | 'rejected' | 'interview',
) {
  const db = createServerClient()
  const { error } = await db.from('applications').update({ status }).eq('id', applicationId)
  if (error) {
    console.error(`Failed to update status for ${applicationId}:`, error)
    throw error
  }
}

export async function updateApplicationAutomationStatus(
  applicationId: string,
  automation_status: 'pending' | 'in_progress' | 'submitted' | 'failed' | 'manual' | 'disabled',
) {
  const db = createServerClient()
  const { error } = await db.from('applications').update({ automation_status }).eq('id', applicationId)
  if (error) {
    console.error(`Failed to update automation status for ${applicationId}:`, error)
    throw error
  }
}

export async function logToApplication(applicationId: string, message: string) {
  const db = createServerClient()
  const logEntry = { timestamp: new Date().toISOString(), message }

  // This is a non-atomic Read-Modify-Write operation.
  // It's acceptable here as one application is processed by one automation at a time.
  const { data: currentData, error: selectError } = await db
    .from('applications')
    .select('automation_logs')
    .eq('id', applicationId)
    .single()

  if (selectError) {
    console.error(`Failed to fetch logs for application ${applicationId}:`, selectError)
    return
  }

  const newLogs = [...(currentData.automation_logs || []), logEntry]

  const { error: updateError } = await db
    .from('applications')
    .update({ automation_logs: newLogs })
    .eq('id', applicationId)

  if (updateError) {
    console.error(`Failed to log to application ${applicationId}:`, updateError)
  }
}
