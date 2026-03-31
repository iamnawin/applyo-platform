import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { embedText } from '@/lib/ai/embed-text'
import { generateMatchesForCandidate } from '@/lib/services/match-service'

// STEP 3: VECTORS & SAVING
// Embedding is optional — if it fails, the resume is always saved and visible.

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

    // Generate the vector embedding — gracefully degrade if it fails
    let embedding: number[] | null = null
    try {
      const embedInput = JSON.stringify(parsedData.skills) + ' ' + (parsedData.summary || '')
      embedding = await embedText(embedInput)
      console.info('[Step3] Embedding generated, dimensions:', embedding?.length)
    } catch (embedErr: any) {
      console.warn('[Step3] Embedding failed (saving without it):', embedErr?.message)
    }

    // Build insert payload — omit processing_status if not supported
    const insertPayload: Record<string, any> = {
      candidate_id: candidate.id,
      storage_path: fileName,
      parsed_data: parsedData,
      embedding,
    }

    // Try with processing_status first, fall back without it if the column doesn't exist
    let finalResume: any = null
    const { data: withStatus, error: errWithStatus } = await supabase
      .from('resumes')
      .insert({ ...insertPayload, processing_status: 'ready' })
      .select()
      .single()

    if (errWithStatus) {
      const isSchemaError = errWithStatus.message?.includes('processing_status')
      if (isSchemaError) {
        // The column doesn't exist — save without it
        console.warn('[Step3] processing_status column missing, saving without it')
        const { data: withoutStatus, error: errWithout } = await supabase
          .from('resumes')
          .insert(insertPayload)
          .select()
          .single()
        if (errWithout) throw new Error(errWithout.message)
        finalResume = withoutStatus
      } else {
        throw new Error(errWithStatus.message)
      }
    } else {
      finalResume = withStatus
    }

    // Trigger candidate-job matching (only if embedding was generated)
    if (embedding) {
      generateMatchesForCandidate(candidate.id).catch(() => {})
    }

    return NextResponse.json({ 
      resume: finalResume,
      embeddingStatus: embedding ? 'ok' : 'skipped'
    }, { status: 201 })
  } catch (err: any) {
    console.error('[Embed & Save Step] Error:', err)
    return NextResponse.json({ error: err.message || 'Database saving failed' }, { status: 500 })
  }
}
