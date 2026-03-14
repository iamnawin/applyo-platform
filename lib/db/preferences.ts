import { createServerClient } from './client'
import type { Preference } from '@/lib/types'

export async function getPreferencesByCandidateId(candidateId: string): Promise<Preference | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('preferences')
    .select('*')
    .eq('candidate_id', candidateId)
    .single()
  if (error) return null
  return data as Preference
}

export async function upsertPreferences(prefs: Partial<Preference> & { candidate_id: string }) {
  const db = createServerClient()
  const { data, error } = await db
    .from('preferences')
    .upsert(prefs, { onConflict: 'candidate_id' })
    .select()
    .single()
  if (error) throw error
  return data as Preference
}
