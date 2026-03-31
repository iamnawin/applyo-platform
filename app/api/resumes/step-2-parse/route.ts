import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { parseResume } from '@/lib/ai/parse-resume'

// STEP 2: AI PARSING
// This endpoint calls Gemini to extract JSON data from the raw text. (Moderate: ~6s)

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
    const { text } = await req.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Call Gemini to structure the extracted text
    const parsedData = await parseResume(text)

    return NextResponse.json({ parsedData }, { status: 200 })
  } catch (err: any) {
    console.error('[AI Parse Step] Error:', err)
    return NextResponse.json({ error: err.message || 'AI Parsing failed' }, { status: 500 })
  }
}
