interface FallbackCoverLetterInput {
  candidateName?: string | null
  resumeSummary?: string | null
  candidateSkills?: string[]
  jobTitle?: string | null
  company?: string | null
  location?: string | null
}

function clean(value: string | null | undefined, fallback: string): string {
  const cleaned = value?.trim()
  return cleaned || fallback
}

function sentence(value: string | null | undefined): string | null {
  const cleaned = value?.trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  return cleaned.endsWith('.') ? cleaned : `${cleaned}.`
}

export function buildFallbackCoverLetter(input: FallbackCoverLetterInput): string {
  const candidateName = clean(input.candidateName, 'Candidate')
  const jobTitle = clean(input.jobTitle, 'this role')
  const company = clean(input.company, 'your team')
  const location = clean(input.location, '')
  const topSkills = (input.candidateSkills ?? [])
    .map(skill => skill.trim())
    .filter(Boolean)
    .slice(0, 5)

  const locationPhrase = location ? ` in ${location}` : ''
  const skillsPhrase = topSkills.length
    ? ` My background includes ${topSkills.join(', ')}, which aligns well with the needs of this position.`
    : ''
  const summary = sentence(input.resumeSummary)

  return [
    'Dear Hiring Manager,',
    '',
    `I am writing to express my interest in the ${jobTitle} opportunity at ${company}${locationPhrase}.`,
    summary ?? `I bring practical experience that aligns with the responsibilities of the ${jobTitle} role.`,
    `${skillsPhrase} I am comfortable working with stakeholders, translating requirements into clear deliverables, and supporting teams through execution with attention to detail.`,
    '',
    `I would welcome the opportunity to discuss how my experience can contribute to ${company}. Thank you for your time and consideration.`,
    '',
    `Sincerely,`,
    candidateName,
  ].join('\n')
}
