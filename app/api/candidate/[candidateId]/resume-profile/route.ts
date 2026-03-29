import { NextResponse } from 'next/server'
import { getLatestResumeByCandidateId, updateResumeParsedData } from '@/lib/db/resumes'
import { createServerClient } from '@/lib/db/client'
import { parsedResumeSchema } from '@/lib/schemas/resume'

// GET handler to fetch the candidate's latest parsed resume data
export async function GET(
  request: Request,
  { params }: { params: { candidateId: string } }
) {
  // TODO: Implement authentication/authorization to ensure only the candidate or an authorized admin can access this.
  const { candidateId } = params

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
  // TODO: Implement authentication/authorization to ensure only the candidate or an authorized admin can modify this.
  const { candidateId } = params

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
