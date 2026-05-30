import { normalizeJob } from '@/lib/ai/normalize-job'
import { embedText } from '@/lib/ai/embed-text'
import { createJob } from '@/lib/db/jobs'
import type { Job } from '@/lib/types'
import type { NormalizedJob } from '@/lib/schemas/job'

function fallbackNormalizeJob(rawDescription: string): NormalizedJob {
  const lines = rawDescription
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  return {
    title: lines[0] || 'Job Opportunity',
    company: lines[1] || 'Unknown Company',
    location: lines[2],
    type: undefined,
    skills: [],
    salary_range: null,
    description_summary: rawDescription.trim().slice(0, 280),
  }
}

export async function ingestJob(
  rawDescription: string,
  source: string,
  sourceUrl?: string,
  companyId?: string | null,
): Promise<Job> {
  let normalized: NormalizedJob
  const isResumeFallback = source === 'resume-fallback'
  if (isResumeFallback) {
    normalized = fallbackNormalizeJob(rawDescription)
  } else {
    try {
      normalized = await normalizeJob(rawDescription)
    } catch {
      normalized = fallbackNormalizeJob(rawDescription)
    }
  }

  let embedding: number[] | null = null
  if (!isResumeFallback) {
    try {
      embedding = await embedText(normalized.skills.join(' ') + ' ' + (normalized.description_summary ?? ''))
    } catch {
      embedding = null
    }
  }

  return createJob({
    company_id: companyId ?? null,
    raw_description: rawDescription,
    normalized_data: normalized,
    embedding,
    status: 'active',
    source,
    source_url: sourceUrl ?? null,
  })
}
