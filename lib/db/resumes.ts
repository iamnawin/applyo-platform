import { createServerClient } from './client'
import type { Resume } from '@/lib/types'

export async function getResumesByCandidateId(candidateId: string): Promise<Resume[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('resumes')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Resume[]
}

export async function createResume(resume: Omit<Resume, 'id' | 'created_at'>): Promise<Resume> {
  const db = createServerClient()
  const { data, error } = await db.from('resumes').insert(resume).select().single()
  if (error) throw error
  return data as Resume
}
