import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAndStore } from '@/lib/services/resume-service'
import { storePendingResume } from '@/lib/services/resume-fallback'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { generateMatchesForCandidate } from '@/lib/services/match-service'
import { AIProviderError, getAIErrorMessage } from '@/lib/ai/providers'

// Vercel Hobby tier has a 10s timeout. We must return before then.
const TIMEOUT_MS = 8500 

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }
  const file = formData.get('file') as File | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  // 1. Upload PDF to Supabase Storage (Quick)
  const fileName = `${user.id}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    return NextResponse.json({ 
      error: `Storage Error: ${uploadError.message}. Make sure the 'resumes' bucket exists.`
    }, { status: 500 })
  }

  // 2. Extract text from PDF (Moderate)
  const arrayBuffer = await file.arrayBuffer()
  let pdfText = ''
  try {
    const { default: pdfParse } = await import('pdf-parse')
    const result = await pdfParse(Buffer.from(arrayBuffer))
    pdfText = result.text || '[Empty PDF content]'
  } catch (err) {
    console.warn('[PDF] Extraction failed:', err)
    pdfText = '[PDF text extraction failed]'
  }

  // 3. AI Parsing Phase (Slow)
  // We use a timeout race to ensure we return to Vercel before the 10s cutoff.
  try {
    const aiPromise = parseAndStore(candidate.id, pdfText, fileName)
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT_REACHED')), TIMEOUT_MS)
    )

    // Result will either be the resume OR a timeout error
    const resume = await Promise.race([aiPromise, timeoutPromise]) as any

    // Fire-and-forget matching
    generateMatchesForCandidate(candidate.id).catch(() => {})

    return NextResponse.json(resume, { status: 201 })
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'TIMEOUT_REACHED'
    
    console.error(isTimeout ? '[API] Timeout reached, returning pending status' : 'Resume AI phase failed', {
      candidateId: candidate.id,
      error: err instanceof Error ? err.message : 'Unknown AI error',
    })

    // If it timed out or hit a provider error, return a "Pending" resume
    const pendingResume = await storePendingResume(candidate.id, fileName)
    
    return NextResponse.json(
      {
        ...pendingResume,
        notice: isTimeout 
          ? 'Resume uploaded! AI parsing is taking a while and will finish in the background.'
          : `Resume uploaded, but AI parsing hit a snag: ${getAIErrorMessage(err) || 'Retrying soon.'}`,
      },
      { status: 201 },
    )
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json([], { status: 200 })

  const resumes = await getResumesByCandidateId(candidate.id)
  return NextResponse.json(resumes)
}
