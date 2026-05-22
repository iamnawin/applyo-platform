import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { upsertCandidate } from '@/lib/db/candidates'

// STEP 1: UPLOAD & EXTRACT TEXT
// This endpoint uploads the file to storage and parses the PDF text. (Fast: ~2s)

export async function POST(req: NextRequest) {
  console.log('[Step1] Request received')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auto-create candidate profile if it doesn't exist yet
  let candidate = await getCandidateByUserId(user.id)
  if (!candidate) {
    candidate = await upsertCandidate({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
    })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
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

  // 1. Upload PDF to Supabase Storage (FAST)
  console.log('[Step1] Uploading to storage, size:', file.size, 'type:', file.type)
  const fileName = `${user.id}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    console.error('[Step1] Storage upload failed:', uploadError.message)
    return NextResponse.json({ 
      error: `Storage Error: ${uploadError.message}. Ensure the 'resumes' bucket exists.`
    }, { status: 500 })
  }
  console.log('[Step1] Storage upload OK:', fileName)

  // 2. Extract Text from PDF (FAST)
  let pdfText = ''
  try {
    console.log('[Step1] Starting PDF text extraction...')
    const arrayBuffer = await file.arrayBuffer()
    const { default: pdfParse } = await import('pdf-parse')
    const result = await pdfParse(Buffer.from(arrayBuffer))
    pdfText = result.text || '[Empty PDF]'
    console.log('[Step1] PDF extraction OK, chars:', pdfText.length)
  } catch (err) {
    console.error('[Step1] PDF extraction failed:', err)
    pdfText = '[PDF extraction failed]'
  }

  // 3. Return the Extracted Text to the Frontend
  console.log('[Step1] Returning text to frontend, pdfText length:', pdfText.length)
  return NextResponse.json({ text: pdfText, fileName }, { status: 200 })
}
