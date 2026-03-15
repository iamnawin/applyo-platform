import { GoogleGenerativeAI } from '@google/generative-ai'
import { matchScoreSchema } from '@/lib/schemas/application'
import type { ParsedResume, NormalizedJob, MatchScore } from '@/lib/types'

const provider = process.env.AI_TEXT_PROVIDER ?? 'gemini'

const SYSTEM_PROMPT = `Score how well this candidate matches the job. Return JSON:
  { score: 0-100, reasons: string[], missingSkills: string[], strongPoints: string[] }`

export async function scoreMatch(resume: ParsedResume, job: NormalizedJob): Promise<MatchScore> {
  const userContent = `CANDIDATE:\n${JSON.stringify(resume)}\n\nJOB:\n${JSON.stringify(job)}`
  let raw: unknown

  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    })
    raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  } else {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${userContent}`)
    raw = JSON.parse(result.response.text())
  }

  return matchScoreSchema.parse(raw)
}
