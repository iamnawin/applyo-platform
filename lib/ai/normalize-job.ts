import OpenAI from 'openai'
import { normalizedJobSchema } from '@/lib/schemas/job'
import type { NormalizedJob } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function normalizeJob(rawDescription: string): Promise<NormalizedJob> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract structured data from the job description. Return JSON:
          { title, company, location, type: "full-time"|"part-time"|"contract"|"remote",
            skills: string[], experience_years: number, salary_range: { min, max, currency } | null,
            description_summary: string }`,
      },
      { role: 'user', content: rawDescription },
    ],
  })

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  return normalizedJobSchema.parse(raw)
}
