import { createCompany, getCompanyByUserId } from '@/lib/db/companies'
import { ingestJob } from './job-service'
import { createManualJobPosting, type ManualJobInput } from './manual-job-service'
import type { Company, Job } from '@/lib/types'

export async function registerCompany(userId: string, name: string, website?: string): Promise<Company> {
  return createCompany({ user_id: userId, name, website })
}

export async function postJob(rawDescription: string, companyId: string): Promise<Job> {
  return ingestJob(rawDescription, 'direct', undefined, companyId)
}

export async function postManualJob(input: ManualJobInput, companyId: string): Promise<Job> {
  return createManualJobPosting(input, companyId)
}
