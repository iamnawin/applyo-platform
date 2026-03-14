import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAndStore } from '@/lib/services/resume-service'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'

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

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  // Upload PDF to Supabase Storage
  const fileName = `${candidate.id}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Extract text from PDF
  const arrayBuffer = await file.arrayBuffer()
  let pdfText = ''
  try {
    const { default: pdfParse } = await import('pdf-parse')
    const { text } = await pdfParse(Buffer.from(arrayBuffer))
    pdfText = text
  } catch {
    pdfText = '[PDF text extraction failed]'
  }

  // Parse + embed + store
  try {
    const resume = await parseAndStore(candidate.id, pdfText, fileName)
    return NextResponse.json(resume, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed'
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
