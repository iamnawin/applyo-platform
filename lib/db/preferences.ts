import { createServerClient } from './client'
import type { Preference } from '@/lib/types'
import { buildLegacyPreferencePayload } from '@/lib/services/preferences-service'

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
  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (
      message.includes('target_companies') ||
      message.includes('preferred_industries') ||
      message.includes('work_authorization') ||
      message.includes('desired_salary_currency') ||
      message.includes('desired_job_titles')
    ) {
      const legacyPayload = buildLegacyPreferencePayload(prefs)
      const { data: legacyData, error: legacyError } = await db
        .from('preferences')
        .upsert(legacyPayload, { onConflict: 'candidate_id' })
        .select()
        .single()
      if (legacyError) throw legacyError
      return {
        ...legacyData,
        target_companies: [],
        preferred_industries: [],
        work_authorization: null,
        desired_salary_currency: null,
        desired_job_titles: legacyData.desired_roles ?? [],
      } as Preference
    }
    throw error
  }
  return data as Preference
}
