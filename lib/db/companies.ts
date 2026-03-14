import { createServerClient } from './client'
import type { Company } from '@/lib/types'

export async function getCompanyByUserId(userId: string): Promise<Company | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data as Company
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
  const db = createServerClient()
  const { data, error } = await db.from('companies').insert(company).select().single()
  if (error) throw error
  return data as Company
}
