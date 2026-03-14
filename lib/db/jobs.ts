import { createServerClient } from './client'
import type { Job } from '@/lib/types'

export async function listJobs(limit = 50): Promise<Job[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Job[]
}

export async function createJob(job: Omit<Job, 'id' | 'created_at'>): Promise<Job> {
  const db = createServerClient()
  const { data, error } = await db.from('jobs').insert(job).select().single()
  if (error) throw error
  return data as Job
}
