import { GoogleGenerativeAI } from '@google/generative-ai'
import { ParsedResume } from '@/lib/types'
import { parsedResumeSchema } from '@/lib/schemas/resume'

// Set AI_TEXT_PROVIDER=openai in env to use GPT-4o-mini instead of Gemini Flash
const provider = process.env.AI_TEXT_PROVIDER ?? 'gemini'

const SYSTEM_PROMPT = `Extract structured data from the resume text. Return JSON with keys:
  name, email, phone, location, summary, skills (array), experience (array of {title, company, start, end, description}),
  education (array of {degree, institution, year}), languages (array).`

export async function parseResume(pdfText: string): Promise<ParsedResume> {
  let raw: unknown

  if (provider === 'groq') {
    const OpenAI = (await import('openai')).default
    const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: pdfText },
      ],
    })
    raw = JSON.parse(completion.choices[0].message.content ?? '{}')
  } else if (provider === 'openai') {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: pdfText },
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
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nResume text:\n${pdfText}`)
    raw = JSON.parse(result.response.text())
  }

  return parsedResumeSchema.parse(raw)
}
