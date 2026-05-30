import { NextResponse } from 'next/server'
import { getLatestResumeByCandidateId, updateResumeParsedData } from '@/lib/db/resumes'
import { createServerClient } from '@/lib/db/client'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getCompanyByUserId } from '@/lib/db/companies'
import { parsedResumeSchema } from '@/lib/schemas/resume'

async function canReadCandidateProfile(candidateId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const candidate = await getCandidateByUserId(user.id)
  if (candidate?.id === candidateId) return true

  const company = await getCompanyByUserId(user.id)
  if (!company) return false

  const db = createServerClient()
  const { data, error } = await db
    .from('applications')
    .select('id, jobs!inner(company_id)')
    .eq('candidate_id', candidateId)
    .eq('jobs.company_id', company.id)
    .in('status', ['approved', 'applied', 'submitted', 'interview', 'rejected'])
    .limit(1)

  return !error && Boolean(data?.length)
}

async function canUpdateCandidateProfile(candidateId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const candidate = await getCandidateByUserId(user.id)
  return candidate?.id === candidateId
}

// GET handler to fetch the candidate's latest parsed resume data
export async function GET(
  request: Request,
  { params }: { params: { candidateId: string } }
) {
  const { candidateId } = params
  if (!(await canReadCandidateProfile(candidateId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const resume = await getLatestResumeByCandidateId(candidateId)

    if (!resume) {
      // If no resume found, return an empty parsed resume structure
      return NextResponse.json(parsedResumeSchema.parse({}), { status: 200 })
    }

    return NextResponse.json(resume.parsed_data, { status: 200 })
  } catch (error) {
    console.error(`Error fetching resume profile for candidate ${candidateId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to fetch resume profile: ${errorMessage}` }, { status: 500 })
  }
}

// PUT handler to update the candidate's latest parsed resume data
export async function PUT(
  request: Request,
  { params }: { params: { candidateId: string } }
) {
  const { candidateId } = params
  if (!(await canUpdateCandidateProfile(candidateId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsedData = parsedResumeSchema.parse(body) // Validate incoming data

    const latestResume = await getLatestResumeByCandidateId(candidateId)

    if (!latestResume) {
      return NextResponse.json({ error: 'No resume found for this candidate to update.' }, { status: 404 })
    }

    const updatedResume = await updateResumeParsedData(latestResume.id, parsedData)

    return NextResponse.json(updatedResume.parsed_data, { status: 200 })
  } catch (error) {
    console.error(`Error updating resume profile for candidate ${candidateId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
    return NextResponse.json({ error: `Failed to update resume profile: ${errorMessage}` }, { status: 500 })
  }
}
