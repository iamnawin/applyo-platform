import OpenAI from 'openai'
import { matchScoreSchema } from '@/lib/schemas/application'
import type { ParsedResume, NormalizedJob, MatchScore } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function scoreMatch(resume: ParsedResume, job: NormalizedJob): Promise<MatchScore> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Score how well this candidate matches the job. Return JSON:
          { score: 0-100, reasons: string[], missingSkills: string[], strongPoints: string[] }`,
      },
      {
        role: 'user',
        content: `CANDIDATE:\n${JSON.stringify(resume)}\n\nJOB:\n${JSON.stringify(job)}`,
      },
    ],
  })

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  return matchScoreSchema.parse(raw)
}
