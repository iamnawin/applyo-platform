import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAndStore } from '@/lib/services/resume-service'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { getResumesByCandidateId } from '@/lib/db/resumes'
import { generateMatchesForCandidate } from '@/lib/services/match-service'

// Vercel Hobby tier has a 10s timeout limit. 
// We decouple the slow AI parsing into a background task and return immediately.

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
  const fileName = `${user.id}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    return NextResponse.json({ 
      error: `Storage Error: ${uploadError.message}. Ensure the 'resumes' bucket exists.`
    }, { status: 500 })
  }

  // 2. Create a "Pending" record in the database immediately (FAST)
  // Use the supabase client directly to avoid weird TypeScript callable/promise issues
  const { data: resumeRecord, error: dbError } = await supabase
    .from('resumes')
    .insert({
      candidate_id: candidate.id,
      storage_path: fileName,
      parsed_data: {
        name: file.name.replace(/\.pdf$/i, ''),
        summary: 'Resume uploaded. AI parsing is pending...',
        skills: [],
        experience: [],
        education: [],
        languages: [],
      },
      embedding: null,
      processing_status: 'pending_ai',
    })
    .select()
    .single()

  if (dbError) {
    console.error('[API] Database insert failed:', dbError)
    return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 })
  }

  // 3. Trigger AI Parsing in the Background (SLOW)
  // fire-and-forget.
  (async () => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { default: pdfParse } = await import('pdf-parse')
      const result = await pdfParse(Buffer.from(arrayBuffer))
      const pdfText = result.text || '[Empty PDF]'

      await parseAndStore(candidate.id, pdfText, fileName)
      await generateMatchesForCandidate(candidate.id)
      console.info(`[Background] AI Parsing success for ${candidate.id}`)
    } catch (err) {
      console.error('[Background] AI Parsing failed:', err)
    }
  })()

  // 4. Return IMMEDIATE success!
  return NextResponse.json(
    {
      ...resumeRecord,
      notice: 'Resume uploaded! We are parsing your details in the background. Refresh in a few seconds.',
    },
    { status: 201 }
  )
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
