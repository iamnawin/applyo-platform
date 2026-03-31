import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { embedText } from '@/lib/ai/embed-text'
import { createResume } from '@/lib/db/resumes'
import { generateMatchesForCandidate } from '@/lib/services/match-service'

// STEP 3: VECTORS & SAVING
// This endpoint creates database embeddings and the final record. (Fast: ~2s)

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

  try {
    const { parsedData, fileName } = await req.json()

    if (!parsedData || !fileName) {
      return NextResponse.json({ error: 'Missing parsed data or file name' }, { status: 400 })
    }

    // Generate the 1536-dimensional vector for AI matching
    const embedInput = JSON.stringify(parsedData.skills) + ' ' + (parsedData.summary || '')
    const embedding = await embedText(embedInput)

    // Save the finalized resume to the database
    const finalResume = await createResume({
      candidate_id: candidate.id,
      storage_path: fileName,
      parsed_data: parsedData,
      embedding,
      processing_status: 'ready',
    })

    // Trigger candidate-job matching asynchronously
    generateMatchesForCandidate(candidate.id).catch(() => {})

    return NextResponse.json({ resume: finalResume }, { status: 201 })
  } catch (err: any) {
    console.error('[Embed & Save Step] Error:', err)
    return NextResponse.json({ error: err.message || 'Database saving failed' }, { status: 500 })
  }
}
