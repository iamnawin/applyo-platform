import { ParsedResume } from '@/lib/types'
import {
  parsedResumeProfileSchema,
  parsedResumeExperienceSchema,
  parsedResumeEducationSkillsSchema,
  parsedResumeSchema,
} from '@/lib/schemas/resume'
import { runStructuredTextTask } from '@/lib/ai/providers'
import { parseResumeWithRegex } from '@/lib/ai/parse-resume-fallback'

// ── Chunk 1: Profile fields ──────────────────────────────────────────────────
export async function parseResumeProfile(pdfText: string) {
  return runStructuredTextTask({
    taskName: 'resume profile parsing',
    systemPrompt: `Extract only the candidate's basic profile information from the resume text.
Return JSON with ONLY these keys: name, email, phone, location, summary, languages.
Do NOT include experience, education, or skills — those will be extracted separately.
Keep each value concise. If a field is missing, omit it.`,
    userContent: `Resume text:\n${pdfText}`,
    schema: parsedResumeProfileSchema,
  })
}

// ── Chunk 2: Work experience ─────────────────────────────────────────────────
export async function parseResumeExperience(pdfText: string) {
  return runStructuredTextTask({
    taskName: 'resume experience parsing',
    systemPrompt: `Extract only the work experience from the resume text.
Return JSON with ONLY this key: experience (an array).
Each item in experience must have: title, company, start (date string), end (date string or "Present"), description.
Do NOT include profile, education, or skills.
If no experience is found, return: {"experience": []}`,
    userContent: `Resume text:\n${pdfText}`,
    schema: parsedResumeExperienceSchema,
  })
}

// ── Chunk 3: Education + Skills ──────────────────────────────────────────────
export async function parseResumeEducationSkills(pdfText: string) {
  return runStructuredTextTask({
    taskName: 'resume education and skills parsing',
    systemPrompt: `Extract only the education and skills from the resume text.
Return JSON with ONLY these keys: skills (an array of strings), education (an array).
Each education item must have: degree, institution, year.
Do NOT include profile or experience.
If a section is missing, return an empty array for it.`,
    userContent: `Resume text:\n${pdfText}`,
    schema: parsedResumeEducationSkillsSchema,
  })
}

// ── Main entry point: tries AI first, falls back to regex ───────────────────
export async function parseResume(pdfText: string): Promise<ParsedResume> {
  try {
    const result = await runStructuredTextTask({
      taskName: 'resume parsing',
      systemPrompt: `Extract structured data from the resume text. Return JSON with keys:
  name, email, phone, location, summary, skills (array), experience (array of {title, company, start, end, description}),
  education (array of {degree, institution, year}), languages (array).`,
      userContent: `Resume text:\n${pdfText}`,
      schema: parsedResumeSchema,
    })
    return result
  } catch (aiError: any) {
    console.warn('[parseResume] AI unavailable, using regex fallback. Reason:', aiError?.message)
    // Parse the raw text using heuristics — always succeeds
    const fallback = parseResumeWithRegex(pdfText)
    // Validate through zod so downstream types are guaranteed
    const validated = parsedResumeSchema.safeParse(fallback)
    if (validated.success) return validated.data
    // If even fallback zod validation fails, return the raw output with defaults
    return {
      name: fallback.name,
      email: fallback.email,
      phone: fallback.phone,
      location: fallback.location,
      summary: fallback.summary,
      skills: fallback.skills,
      experience: fallback.experience,
      education: fallback.education,
      languages: [],
    }
  }
}
