import { ParsedResume } from '@/lib/types'
import { parsedResumeSchema } from '@/lib/schemas/resume'
import { runStructuredTextTask } from '@/lib/ai/providers'

const SYSTEM_PROMPT = `Extract structured data from the resume text. Return JSON with keys:
  name, email, phone, location, summary, skills (array), experience (array of {title, company, start, end, description}),
  education (array of {degree, institution, year}), languages (array).`

export async function parseResume(pdfText: string): Promise<ParsedResume> {
  return runStructuredTextTask({
    taskName: 'resume parsing',
    systemPrompt: SYSTEM_PROMPT,
    userContent: `Resume text:\n${pdfText}`,
    schema: parsedResumeSchema,
  })
}
