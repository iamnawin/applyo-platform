/**
 * FreeLLMAPI Client — OpenAI-compatible proxy client.
 * All AI text calls route through this when AI_PROVIDER=freellmapi.
 * Never import this from frontend/client components.
 */

export interface FreeLLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface FreeLLMResponse {
  success: boolean
  content: string
  provider?: string
  model?: string
  error?: string
}

const DEFAULT_TIMEOUT = 30_000

function getConfig() {
  const baseUrl = process.env.AI_BASE_URL || 'http://localhost:3001/v1'
  const apiKey = process.env.AI_API_KEY || ''
  const model = process.env.AI_DEFAULT_MODEL || 'auto'
  const timeout = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT
  return { baseUrl, apiKey, model, timeout }
}

export async function chatCompletion(
  messages: FreeLLMMessage[],
  opts?: { model?: string; temperature?: number; maxTokens?: number; responseFormat?: 'json' },
): Promise<FreeLLMResponse> {
  const { baseUrl, apiKey, model, timeout } = getConfig()

  const body: Record<string, unknown> = {
    model: opts?.model ?? model,
    messages,
  }
  if (opts?.temperature !== undefined) body.temperature = opts.temperature
  if (opts?.maxTokens !== undefined) body.max_tokens = opts.maxTokens
  if (opts?.responseFormat === 'json') body.response_format = { type: 'json_object' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { success: false, content: '', error: `FreeLLMAPI ${res.status}: ${errBody.slice(0, 200)}` }
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
      model?: string
    }

    const content = data.choices?.[0]?.message?.content ?? ''
    const routedVia = res.headers.get('x-routed-via') ?? undefined

    return {
      success: true,
      content,
      model: data.model ?? routedVia?.split('/')[1],
      provider: routedVia?.split('/')[0],
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, content: '', error: 'FreeLLMAPI request timed out' }
    }
    return { success: false, content: '', error: err instanceof Error ? err.message : 'Unknown error' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Structured JSON completion — sends a system prompt requesting JSON output,
 * parses the response as JSON, and returns the raw parsed object.
 */
export async function jsonCompletion(
  systemPrompt: string,
  userContent: string,
  opts?: { model?: string; temperature?: number },
): Promise<unknown> {
  const resp = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    { ...opts, responseFormat: 'json' },
  )

  if (!resp.success) {
    throw new Error(resp.error ?? 'FreeLLMAPI call failed')
  }

  // Clean markdown code fences if present
  let text = resp.content.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  }

  return JSON.parse(text)
}
