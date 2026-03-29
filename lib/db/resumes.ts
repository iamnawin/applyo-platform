import { createServerClient } from './client'
import type { Resume, ParsedResume } from '@/lib/types'

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

export async function updateResumeParsedData(resumeId: string, parsedData: ParsedResume): Promise<Resume> {
  const db = createServerClient()
  const { data, error } = await db
    .from('resumes')
    .update({ parsed_data: parsedData })
    .eq('id', resumeId)
    .select()
    .single()
  if (error) throw error
  return data as Resume
}

export async function getLatestResumeByCandidateId(candidateId: string): Promise<Resume | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('resumes')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      return null
    }
    throw error
  }
  return data as Resume
}
