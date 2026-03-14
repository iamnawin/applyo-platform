import { createServerClient } from './client'
import type { Candidate } from '@/lib/types'

export async function getCandidateByUserId(userId: string): Promise<Candidate | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('candidates')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data as Candidate
}

export async function upsertCandidate(candidate: Partial<Candidate> & { user_id: string }) {
  const db = createServerClient()
  const { data, error } = await db
    .from('candidates')
    .upsert(candidate, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data as Candidate
}
