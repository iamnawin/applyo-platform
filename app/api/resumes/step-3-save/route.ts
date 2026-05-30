import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { embedText } from '@/lib/ai/embed-text'
import { generateMatchesForCandidate } from '@/lib/services/match-service'
import { discoverJobs } from '@/lib/services/job-discovery-service'
import { getPreferencesByCandidateId, upsertPreferences } from '@/lib/db/preferences'
import { buildPreferencesFromResume } from '@/lib/services/preferences-service'

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
    console.log('[Step3] Received parsedData keys:', Object.keys(parsedData ?? {}), 'fileName:', fileName)
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
  console.log('[Step3] Inserting resume into DB...')
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
    console.error('[Step3] DB insert failed:', dbError.message, dbError.details)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  console.log('[Step3] DB insert OK, resume id:', finalResume?.id)

  // Auto-fill preferences from parsed resume if none exist yet
  const existingPrefs = await getPreferencesByCandidateId(candidate.id)
  if (!existingPrefs) {
    try {
      await upsertPreferences(buildPreferencesFromResume(parsedData, candidate.id))
      console.info('[Step3] Auto-filled preferences from resume')
    } catch (e: any) {
      console.warn('[Step3] Auto-fill preferences failed:', e?.message)
    }
  }

  // Trigger job discovery + matching in background (regardless of embedding)
  const runBackgroundMatching = async () => {
    try {
      const preferences = await getPreferencesByCandidateId(candidate.id)
      const skills = parsedData.skills ?? []
      const titles = (parsedData.experience ?? []).map((experience: any) => experience.title).filter(Boolean)
      await discoverJobs(candidate.id, preferences, skills, titles)
      await generateMatchesForCandidate(candidate.id)
    } catch (e: any) {
      console.warn('[Step3] Background matching failed:', e?.message)
    }
  }
  runBackgroundMatching()

  return NextResponse.json({ resume: finalResume }, { status: 201 })
}
