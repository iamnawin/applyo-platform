/**
 * Fallback resume parser using regex + heuristics.
 * Used when AI providers are rate-limited or unavailable.
 * Extracts: name, email, phone, location, skills, experience, education.
 */

// Common tech skills to match against
const KNOWN_SKILLS = [
  // Languages
  'javascript','typescript','python','java','c++','c#','go','rust','ruby','php','swift','kotlin','scala','r',
  // Frontend
  'react','next.js','nextjs','vue','angular','svelte','html','css','tailwind','sass','webpack','vite',
  // Backend
  'node.js','nodejs','express','fastapi','django','flask','spring','laravel','rails','nestjs','hono',
  // Databases
  'sql','postgresql','mysql','mongodb','redis','supabase','firebase','prisma','sqlite',
  // Cloud / DevOps
  'aws','azure','gcp','docker','kubernetes','terraform','vercel','netlify','github actions','ci/cd',
  // AI / Data
  'machine learning','deep learning','tensorflow','pytorch','openai','langchain','pandas','numpy',
  // General
  'git','rest','graphql','grpc','microservices','agile','scrum','linux','bash',
]

function extractEmail(text: string): string | undefined {
  const match = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
  return match?.[0]
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?\d[\d\s\-().]{7,}\d)/)
  return match?.[0]?.trim()
}

function extractName(text: string): string {
  // Try to get name from first non-empty line(s)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // Skip lines that look like URLs, emails, phone numbers, or section headers
  for (const line of lines.slice(0, 6)) {
    if (!line.match(/[@|http|www|\d{5}|resume|curriculum|vitae]/i) && line.length > 2 && line.length < 60) {
      return line
    }
  }
  return lines[0] ?? 'Unknown'
}

function extractLocation(text: string): string | undefined {
  // Look for common location patterns
  const match = text.match(/([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*,\s*(?:[A-Z]{2}(?:\s+\d{5})?|[A-Z][a-z]+))/m)
  return match?.[0]
}

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase()
  const found = new Set<string>()

  for (const skill of KNOWN_SKILLS) {
    // Match whole word (or phrase)
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowerText)) {
      found.add(skill.charAt(0).toUpperCase() + skill.slice(1))
    }
  }

  return Array.from(found).slice(0, 30)
}

function extractExperience(text: string) {
  const experience: Array<{ title: string; company: string; start?: string; end?: string; description?: string }> = []

  // Find experience section
  const expSection = text.match(/(?:experience|work history|employment)([\s\S]*?)(?:education|skills|projects|certifications|$)/i)?.[1] ?? ''
  if (!expSection) return experience

  // Match job entries: Title at/@ Company (optional dates)
  const jobBlocks = expSection.split(/\n\s*\n/).filter(b => b.trim().length > 10)

  for (const block of jobBlocks.slice(0, 6)) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // First line is usually "Title at Company" or "Title | Company"
    const titleLine = lines[0]
    const titleMatch = titleLine.match(/^(.+?)(?:\s+(?:at|@|\||–|-|·)\s+(.+))?$/)

    const title = titleMatch?.[1]?.trim() ?? titleLine
    const company = titleMatch?.[2]?.trim() ?? ''

    // Look for date range
    const dateMatch = block.match(/(\w+\s*\d{4}|\d{4})\s*[-–—to]+\s*(\w+\s*\d{4}|\d{4}|present|current)/i)
    const start = dateMatch?.[1]
    const end = dateMatch?.[2]

    const description = lines.slice(1).join(' ').slice(0, 300) || undefined

    if (title.length > 1) {
      experience.push({ title, company, start, end, description })
    }
  }

  return experience
}

function extractEducation(text: string) {
  const education: Array<{ degree: string; institution: string; year?: string }> = []

  const eduSection = text.match(/(?:education|academic|qualifications?)([\s\S]*?)(?:experience|skills|projects|certifications|$)/i)?.[1] ?? ''
  if (!eduSection) return education

  const blocks = eduSection.split(/\n\s*\n/).filter(b => b.trim().length > 5)

  for (const block of blocks.slice(0, 4)) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    const degree = lines[0]
    const institution = lines[1] ?? ''
    const yearMatch = block.match(/\b(19|20)\d{2}\b/)
    const year = yearMatch?.[0]

    if (degree.length > 2) {
      education.push({ degree, institution, year })
    }
  }

  return education
}

function extractSummary(text: string): string | undefined {
  const match = text.match(/(?:summary|profile|about|objective)[:\s]+([\s\S]{20,400}?)(?:\n\n|\n[A-Z])/i)
  return match?.[1]?.trim().replace(/\s+/g, ' ')
}

export function parseResumeWithRegex(pdfText: string) {
  return {
    name: extractName(pdfText),
    email: extractEmail(pdfText),
    phone: extractPhone(pdfText),
    location: extractLocation(pdfText),
    summary: extractSummary(pdfText),
    skills: extractSkills(pdfText),
    experience: extractExperience(pdfText),
    education: extractEducation(pdfText),
    languages: [] as string[],
  }
}
