import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatCompletion, type FreeLLMMessage } from '@/lib/ai/freellmapi-client'

const SYSTEM_PROMPTS: Record<string, string> = {
  draft: 'You are a professional career assistant. Help draft cover letters, emails, and application responses. Be concise and professional.',
  explain: 'You are a career advisor. Explain job requirements, company culture, or career concepts clearly and helpfully.',
  recommend: 'You are a job matching advisor. Based on the context provided, recommend actions or improvements.',
  chat: 'You are Applyo AI, a helpful career assistant. Answer questions about job searching, applications, and career development.',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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

  // Build messages with system prompt
  const messages: FreeLLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...body.messages,
  ]

  // If context provided, inject it as a system message
  if (body.context && Object.keys(body.context).length > 0) {
    messages.splice(1, 0, {
      role: 'system',
      content: `Context: ${JSON.stringify(body.context)}`,
    })
  }

  const result = await chatCompletion(messages)

  if (!result.success) {
    // Graceful fallback — never expose raw errors
    console.error('[ai/chat] FreeLLMAPI error:', result.error)
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
