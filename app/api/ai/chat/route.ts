import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/db/client'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { buildFallbackCoverLetter } from '@/lib/ai/cover-letter-fallback'
import { chatCompletion, type FreeLLMMessage } from '@/lib/ai/freellmapi-client'
import { rateLimit } from '@/lib/rate-limit'
import type { Job, ParsedResume } from '@/lib/types'

const SYSTEM_PROMPTS: Record<string, string> = {
  draft: 'You are a professional career assistant. Help draft cover letters, emails, and application responses. Be concise and professional.',
  cover_letter: 'You are a professional career assistant. Write concise, specific cover letters using the candidate and job context. Do not invent credentials.',
  explain: 'You are a career advisor. Explain job requirements, company culture, or career concepts clearly and helpfully.',
  recommend: 'You are a job matching advisor. Based on the context provided, recommend actions or improvements.',
  chat: 'You are Applyo AI, a helpful career assistant. Answer questions about job searching, applications, and career development.',
}

function extractQuotedValue(message: string, label: string): string | undefined {
  const pattern = new RegExp(`${label}\\s+"([^"]+)"`, 'i')
  return message.match(pattern)?.[1]
}

function extractCoverLetterFallbackFromMessage(messages: FreeLLMMessage[]) {
  const userText = [...messages].reverse().find(message => message.role === 'user')?.content ?? ''
  return {
    jobTitle: extractQuotedValue(userText, 'role'),
    company: extractQuotedValue(userText, 'at'),
    location: userText.match(/Location:\s*([^.\n]+?)(?:\.|$)/i)?.[1]?.trim(),
    candidateSkills: userText.match(/Skills needed:\s*([^.\n]+?)(?:\.|$)/i)?.[1]
      ?.split(',')
      .map(skill => skill.trim())
      .filter(Boolean),
  }
}

async function buildCoverLetterFallback(
  userId: string,
  body: { messages?: FreeLLMMessage[]; context?: Record<string, unknown> },
) {
  const messageFallback = extractCoverLetterFallbackFromMessage(body.messages ?? [])
  const candidateId = typeof body.context?.candidateId === 'string' ? body.context.candidateId : undefined
  const jobId = typeof body.context?.jobId === 'string' ? body.context.jobId : undefined

  if (!candidateId || !jobId) {
    return buildFallbackCoverLetter(messageFallback)
  }

  try {
    const candidate = await getCandidateByUserId(userId)
    if (!candidate || candidate.id !== candidateId) {
      return buildFallbackCoverLetter(messageFallback)
    }

    const db = createServerClient()
    const [{ data: resume }, { data: job }] = await Promise.all([
      db
        .from('resumes')
        .select('parsed_data')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle(),
    ])

    const parsedResume = resume?.parsed_data as ParsedResume | undefined
    const typedJob = job as Job | null

    return buildFallbackCoverLetter({
      candidateName: parsedResume?.name,
      resumeSummary: parsedResume?.summary,
      candidateSkills: parsedResume?.skills,
      jobTitle: typedJob?.normalized_data?.title ?? messageFallback.jobTitle,
      company: typedJob?.normalized_data?.company ?? messageFallback.company,
      location: typedJob?.normalized_data?.location ?? messageFallback.location,
    })
  } catch (error) {
    console.error('[ai/chat] Cover letter fallback context failed:', error)
    return buildFallbackCoverLetter(messageFallback)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = rateLimit(`ai-chat:${user.id}`)
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  let body: { messages?: FreeLLMMessage[]; context?: Record<string, unknown>; mode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.messages?.length) {
    return NextResponse.json({ success: false, error: 'Messages required' }, { status: 400 })
  }

  const mode = body.mode ?? 'chat'
  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat

  const messages: FreeLLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...body.messages,
  ]

  if (body.context && Object.keys(body.context).length > 0) {
    messages.splice(1, 0, {
      role: 'system',
      content: `Context: ${JSON.stringify(body.context)}`,
    })
  }

  const result = await chatCompletion(messages)

  if (!result.success || !result.content.trim()) {
    console.error('[ai/chat] AI error:', result.error)
    if (mode === 'cover_letter') {
      const fallback = await buildCoverLetterFallback(user.id, body)
      return NextResponse.json({
        success: true,
        content: fallback,
        provider: 'fallback',
        model: 'deterministic-cover-letter',
      })
    }

    return NextResponse.json({
      success: false,
      content: '',
      error: 'AI is temporarily unavailable. Please try again shortly.',
    })
  }

  return NextResponse.json({
    success: true,
    content: result.content,
    provider: result.provider,
    model: result.model,
  })
}
