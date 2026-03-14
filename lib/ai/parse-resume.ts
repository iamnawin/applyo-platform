import OpenAI from 'openai'
import { ParsedResume } from '@/lib/types'
import { parsedResumeSchema } from '@/lib/schemas/resume'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function parseResume(pdfText: string): Promise<ParsedResume> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract structured data from the resume text. Return JSON with keys:
          name, email, phone, location, summary, skills (array), experience (array of {title, company, start, end, description}),
          education (array of {degree, institution, year}), languages (array).`,
      },
      { role: 'user', content: pdfText },
    ],
  })

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  return parsedResumeSchema.parse(raw)
}
