import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { parseResume } from '@/lib/ai/parse-resume'

// Tell Vercel this function may take up to 60 seconds (AI + possible retry backoff)
export const maxDuration = 60

// STEP 2: AI PARSING
// Calls the AI to extract structured JSON from raw PDF text.
// The AI provider layer now has retry-with-backoff for 429 rate limit errors.

export async function POST(req: NextRequest) {
  console.log('[Step2] Request received')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })
  }

  let text: string
  try {
    const body = await req.json()
    text = body.text
    console.log('[Step2] Text length received:', text?.length)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  try {
    console.log('[Step2] Calling parseResume (AI with regex fallback)...')
    const parsedData = await parseResume(text)
    const usedFallback = !parsedData.email && parsedData.skills.length > 0  // rough heuristic
    console.log('[Step2] Done. Keys:', Object.keys(parsedData), 'skills:', parsedData.skills?.length)
    return NextResponse.json({ parsedData }, { status: 200 })
  } catch (err: any) {
    // parseResume should never throw anymore, but keep this as a safety net
    console.error('[Step2] Unexpected error:', err?.message ?? err)
    return NextResponse.json({ error: err.message || 'AI Parsing failed' }, { status: 500 })
  }
}
