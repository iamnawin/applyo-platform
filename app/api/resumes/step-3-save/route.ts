import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { embedText } from '@/lib/ai/embed-text'
import { generateMatchesForCandidate } from '@/lib/services/match-service'

// STEP 3: VECTORS & SAVING
// Embedding is optional — if it fails, the resume is always saved and visible.
// processing_status is NOT included in the insert to avoid schema issues.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })
  }

  let parsedData: any, fileName: string
  try {
    const body = await req.json()
    parsedData = body.parsedData
    fileName = body.fileName
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!parsedData || !fileName) {
    return NextResponse.json({ error: 'Missing parsed data or file name' }, { status: 400 })
  }

  // Try to generate embedding — silently skip if it fails
  let embedding: number[] | null = null
  try {
    const embedInput = (parsedData.skills ? JSON.stringify(parsedData.skills) : '') + ' ' + (parsedData.summary || '')
    embedding = await embedText(embedInput.trim())
    console.info('[Step3] Embedding OK, dims:', embedding?.length)
  } catch (e: any) {
    console.warn('[Step3] Embedding skipped:', e?.message)
  }

  // Insert resume — no processing_status to avoid schema issues
  const { data: finalResume, error: dbError } = await supabase
    .from('resumes')
    .insert({
      candidate_id: candidate.id,
      storage_path: fileName,
      parsed_data: parsedData,
      embedding,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[Step3] DB insert failed:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Trigger job matching in background (only if embedding exists)
  if (embedding) {
    generateMatchesForCandidate(candidate.id).catch(() => {})
  }

  return NextResponse.json({ resume: finalResume }, { status: 201 })
}
