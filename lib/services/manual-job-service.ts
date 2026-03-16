import { createJob } from '@/lib/db/jobs'
import type { Job, NormalizedJob } from '@/lib/types'

export interface ManualJobInput {
  title: string
  company: string
  location?: string
  type?: 'full-time' | 'part-time' | 'contract' | 'remote'
  description: string
  skills?: string[]
  source?: string
  source_url?: string
}

function summarizeDescription(description: string): string {
  return description.trim().slice(0, 280)
}

export async function createManualJobPosting(input: ManualJobInput, companyId: string): Promise<Job> {
  const normalized: NormalizedJob = {
    title: input.title.trim(),
    company: input.company.trim(),
    location: input.location?.trim() || undefined,
    type: input.type,
    skills: input.skills ?? [],
    salary_range: null,
    description_summary: summarizeDescription(input.description),
  }

  return createJob({
    company_id: companyId,
    raw_description: input.description.trim(),
    normalized_data: normalized,
    embedding: null,
    status: 'active',
    source: input.source?.trim() || 'manual',
    source_url: input.source_url?.trim() || null,
  })
}
