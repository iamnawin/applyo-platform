import { createServerClient } from '@/lib/db/client'
import { getPreferencesByCandidateId } from '@/lib/db/preferences'

const DEFAULT_DAILY_LIMIT = 10

export async function getDailyUsage(candidateId: string): Promise<number> {
  const db = createServerClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await db
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .gte('applied_at', today.toISOString())

  return count ?? 0
}

export async function canApplyToday(candidateId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const prefs = await getPreferencesByCandidateId(candidateId)
  const limit = prefs?.max_applications_per_day ?? DEFAULT_DAILY_LIMIT
  const used = await getDailyUsage(candidateId)
  return { allowed: used < limit, used, limit }
}

export async function getRemainingQuota(candidateId: string): Promise<number> {
  const { allowed, used, limit } = await canApplyToday(candidateId)
  return allowed ? limit - used : 0
}
