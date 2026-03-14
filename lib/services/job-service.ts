import { normalizeJob } from '@/lib/ai/normalize-job'
import { embedText } from '@/lib/ai/embed-text'
import { createJob } from '@/lib/db/jobs'
import type { Job } from '@/lib/types'

export async function ingestJob(rawDescription: string, source: string, sourceUrl?: string): Promise<Job> {
  const normalized = await normalizeJob(rawDescription)
  const embedding = await embedText(normalized.skills.join(' ') + ' ' + normalized.description_summary)
  return createJob({
    company_id: null,
    raw_description: rawDescription,
    normalized_data: normalized,
    embedding,
    status: 'active',
    source,
    source_url: sourceUrl ?? null,
  })
}
