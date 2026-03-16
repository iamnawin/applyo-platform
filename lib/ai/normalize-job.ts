import { normalizedJobSchema } from '@/lib/schemas/job'
import type { NormalizedJob } from '@/lib/types'
import { runStructuredTextTask } from '@/lib/ai/providers'

const SYSTEM_PROMPT = `Extract structured data from the job description. Return JSON:
  { title, company, location, type: "full-time"|"part-time"|"contract"|"remote",
    skills: string[], experience_years: number, salary_range: { min, max, currency } | null,
    description_summary: string }`

export async function normalizeJob(rawDescription: string): Promise<NormalizedJob> {
  return runStructuredTextTask({
    taskName: 'job normalization',
    systemPrompt: SYSTEM_PROMPT,
    userContent: `Job description:\n${rawDescription}`,
    schema: normalizedJobSchema,
  })
}
