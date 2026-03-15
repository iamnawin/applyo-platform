import { GoogleGenerativeAI } from '@google/generative-ai'
import { normalizedJobSchema } from '@/lib/schemas/job'
import type { NormalizedJob } from '@/lib/types'

// Set AI_TEXT_PROVIDER=openai in env to use GPT-4o-mini instead of Gemini Flash
const provider = process.env.AI_TEXT_PROVIDER ?? 'gemini'

const SYSTEM_PROMPT = `Extract structured data from the job description. Return JSON:
  { title, company, location, type: "full-time"|"part-time"|"contract"|"remote",
    skills: string[], experience_years: number, salary_range: { min, max, currency } | null,
    description_summary: string }`

export async function normalizeJob(rawDescription: string): Promise<NormalizedJob> {
  let raw: unknown

  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawDescription },
      ],
    })
    raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  } else {
    // Default: Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nJob description:\n${rawDescription}`)
    raw = JSON.parse(result.response.text())
  }

  return normalizedJobSchema.parse(raw)
}
