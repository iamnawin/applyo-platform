import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAndStore } from '@/lib/services/resume-service'
import { storePendingResume } from '@/lib/services/resume-fallback'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { generateMatchesForCandidate } from '@/lib/services/match-service'
import { AIProviderError, getAIErrorMessage } from '@/lib/ai/providers'

// POST /api/resumes — upload PDF, parse it, store embedding
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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse form data'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  const isPdf = file.type === 'application/pdf' || file.name?.endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  // 1. Upload PDF to Supabase Storage
  const fileName = `${user.id}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    // High-visibility error to help users fix their Supabase Bucket setup
    return NextResponse.json({ 
      error: `Storage Error: ${uploadError.message}. Make sure the 'resumes' bucket exists and is writable in your Supabase dashboard.`
    }, { status: 500 })
  }

  // 2. Extract text from PDF
  const arrayBuffer = await file.arrayBuffer()
  let pdfText = ''
  try {
    const { default: pdfParse } = await import('pdf-parse')
    const result = await pdfParse(Buffer.from(arrayBuffer))
    pdfText = result.text || '[Empty PDF content]'
  } catch (err) {
    console.warn('[PDF] Extraction failed, continuing with placeholder:', err)
    pdfText = '[PDF text extraction failed]'
  }

  // 3. Parse + embed + store (AI Phase)
  try {
    const resume = await parseAndStore(candidate.id, pdfText, fileName)

    // Fire-and-forget matching
    generateMatchesForCandidate(candidate.id).catch(() => {})

    return NextResponse.json(resume, { status: 201 })
  } catch (err) {
    console.error('Resume AI phase failed', {
      candidateId: candidate.id,
      error: err instanceof Error ? err.message : 'Unknown AI error',
    })

    if (err instanceof AIProviderError) {
      const pendingResume = await storePendingResume(candidate.id, fileName)
      return NextResponse.json(
        {
          ...pendingResume,
          notice: `Resume uploaded, but AI parsing is temporarily unavailable: ${err.message}. It will be retried later.`,
        },
        { status: 201 },
      )
    }

    const message = getAIErrorMessage(err) ?? (err instanceof Error ? err.message : 'Processing failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/resumes — list resumes for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    return NextResponse.json([], { status: 200 })
  }

  const resumes = await getResumesByCandidateId(candidate.id)
  return NextResponse.json(resumes)
}
