import type { ParsedResume, NormalizedJob } from '@/lib/types'

interface GreenhouseApiApplyParams {
  jobUrl: string
  resume: ParsedResume
  resumeFile: Buffer
  resumeFileName: string
  log: (message: string) => Promise<void>
  generatedCoverLetter?: string
  jobData?: NormalizedJob
}

interface GreenhouseQuestion {
  required: boolean
  label: string
  fields: Array<{ name: string; type: string; values?: Array<{ value: number | string; label: string }> }>
}

/**
 * Parse board_token and job_id from a Greenhouse URL.
 * Formats: boards.greenhouse.io/{board_token}/jobs/{id}
 *          boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{id}
 */
export function parseGreenhouseUrl(url: string): { boardToken: string; jobId: string } | null {
  const match = url.match(/boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([^/]+)\/jobs\/(\d+)/)
  return match ? { boardToken: match[1], jobId: match[2] } : null
}

export function isGreenhouseDirectUrl(url: string): boolean {
  return parseGreenhouseUrl(url) !== null
}

/**
 * Submit an application directly via Greenhouse Job Board API.
 * No browser needed — pure HTTP POST.
 */
export async function applyViaGreenhouseApi({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
}: GreenhouseApiApplyParams): Promise<void> {
  const parsed = parseGreenhouseUrl(jobUrl)
  if (!parsed) throw new Error(`Not a valid Greenhouse URL: ${jobUrl}`)

  const { boardToken, jobId } = parsed
  await log(`Greenhouse API: board="${boardToken}", job=${jobId}`)

  const apiKey = process.env.GREENHOUSE_API_KEY || ''
  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
  const baseUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`

  // Fetch job questions to understand required fields
  let questions: GreenhouseQuestion[] = []
  try {
    const questionsRes = await fetch(`${baseUrl}?questions=true`)
    if (questionsRes.ok) {
      const jobData = await questionsRes.json()
      questions = jobData.questions ?? []
      await log(`Fetched ${questions.length} application questions`)
    }
  } catch {
    await log('Could not fetch job questions, submitting with standard fields only')
  }

  // Build multipart form data
  const form = new FormData()
  const [firstName, ...lastParts] = (resume.name || 'Applicant').split(' ')
  const lastName = lastParts.join(' ') || 'Unknown'

  form.append('first_name', firstName)
  form.append('last_name', lastName)
  form.append('email', resume.email || '')
  if (resume.phone) form.append('phone', resume.phone)
  if (resume.location) form.append('location', resume.location)

  // Attach resume
  const resumeBlob = new Blob([new Uint8Array(resumeFile)], { type: 'application/pdf' })
  form.append('resume', resumeBlob, resumeFileName)

  // Attach cover letter as text
  if (generatedCoverLetter) {
    form.append('cover_letter_text', generatedCoverLetter)
  }

  // Answer custom questions with basic field mapping
  for (const q of questions) {
    if (q.label.toLowerCase().includes('first name') || q.label.toLowerCase().includes('last name') ||
        q.label.toLowerCase().includes('email') || q.label.toLowerCase().includes('resume') ||
        q.label.toLowerCase().includes('cover letter')) continue

    for (const field of q.fields) {
      const value = inferQuestionAnswer(field.name, q.label, field.type, field.values, resume)
      if (value !== null) {
        form.append(field.name, String(value))
        await log(`Answered "${q.label}" → "${String(value).slice(0, 40)}"`)
      }
    }
  }

  // GDPR consent (if any company requires it, consent to proceed)
  form.append('data_compliance[gdpr_processing_consent_given]', 'true')
  form.append('data_compliance[gdpr_retention_consent_given]', 'true')

  // Submit
  await log('Submitting application via Greenhouse API...')
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Authorization': authHeader },
    body: form,
  })

  if (response.ok || response.status === 201 || response.status === 200) {
    await log('✓ Application submitted successfully via Greenhouse API')
    return
  }

  const errorBody = await response.text().catch(() => 'unknown error')
  throw new Error(`Greenhouse API returned ${response.status}: ${errorBody}`)
}

function inferQuestionAnswer(
  fieldName: string,
  label: string,
  type: string,
  values: Array<{ value: number | string; label: string }> | undefined,
  resume: ParsedResume,
): string | number | null {
  const l = label.toLowerCase()
  const n = fieldName.toLowerCase()

  // Phone
  if (l.includes('phone') || n.includes('phone')) return resume.phone || null

  // Location
  if (l.includes('location') || l.includes('city') || l.includes('address')) return resume.location || null

  // LinkedIn
  if (l.includes('linkedin') || n.includes('linkedin')) return null

  // Years of experience
  if (l.includes('year') && l.includes('experience')) {
    return String(Math.max(resume.experience?.length ?? 1, 1))
  }

  // For dropdowns/radios, pick first non-empty option as safe default
  if (type === 'multi_value_single_select' && values?.length) {
    return values[0].value
  }

  return null
}
