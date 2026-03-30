import { createServerClient } from './client'
import type { TargetCompany } from '../types'

export async function getActiveTargetCompanies(): Promise<TargetCompany[]> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('target_companies')
    .select('*')
    .eq('is_active', true)
    
  if (error) {
    console.error('Error fetching target companies:', error)
    return []
  }
  
  return data as TargetCompany[]
}

export async function updateTargetCompanyLastScraped(id: string): Promise<void> {
  const supabase = createServerClient()
  
  await supabase
    .from('target_companies')
    .update({ last_scraped_at: new Date().toISOString() })
    .eq('id', id)
}
