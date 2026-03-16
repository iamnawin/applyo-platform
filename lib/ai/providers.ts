import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

export type TextProvider = 'gemini' | 'openai' | 'groq'
export type EmbeddingProvider = 'gemini' | 'openai'

type AnyProvider = TextProvider | EmbeddingProvider
type ProviderErrorCode = 'temporary_unavailable' | 'configuration_error' | 'invalid_response'

const DEFAULT_TEXT_PROVIDER_ORDER: TextProvider[] = ['gemini', 'openai', 'groq']
const DEFAULT_EMBEDDING_PROVIDER_ORDER: EmbeddingProvider[] = ['gemini']
const SUPPORTED_TEXT_PROVIDERS = new Set<TextProvider>(DEFAULT_TEXT_PROVIDER_ORDER)
const SUPPORTED_EMBEDDING_PROVIDERS = new Set<EmbeddingProvider>(['gemini', 'openai'])

export const GEMINI_EMBEDDING_DIMENSIONS = 768
const OPENAI_EMBEDDING_DIMENSIONS = 1536

export class AIProviderError extends Error {
  code: ProviderErrorCode
  cause?: unknown
  attempts: Array<{ provider: AnyProvider; message: string }>

  constructor(
    message: string,
    code: ProviderErrorCode,
    options?: { cause?: unknown; attempts?: Array<{ provider: AnyProvider; message: string }> },
  ) {
    super(message)
    this.name = 'AIProviderError'
    this.code = code
    this.cause = options?.cause
    this.attempts = options?.attempts ?? []
  }
}

type ProviderAttempt = { provider: AnyProvider; message: string }

function parseProviderOrder<T extends string>(
  rawOrder: string | undefined,
  rawSingleProvider: string | undefined,
  supported: Set<T>,
  defaultOrder: T[],
): T[] {
  const source = rawOrder ?? rawSingleProvider
  const parsed = source
    ?.split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value): value is T => supported.has(value as T))

  const ordered = parsed?.length ? parsed : defaultOrder
  return Array.from(new Set(ordered))
}

function getProviderApiKey(provider: AnyProvider): string | undefined {
  switch (provider) {
    case 'gemini':
      return process.env.GOOGLE_AI_API_KEY
    case 'openai':
      return process.env.OPENAI_API_KEY
    case 'groq':
      return process.env.GROQ_API_KEY
  }
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const maybeStatus = Reflect.get(error, 'status')
  return typeof maybeStatus === 'number' ? maybeStatus : undefined
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const maybeCode = Reflect.get(error, 'code')
  return typeof maybeCode === 'string' ? maybeCode.toLowerCase() : undefined
}

export function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    return error.code !== 'configuration_error'
  }

  const status = getErrorStatus(error)
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true
  }

  const code = getErrorCode(error)
  if (code && ['rate_limit_exceeded', 'insufficient_quota', 'resource_exhausted', 'overloaded'].includes(code)) {
    return true
  }

  const message = summarizeError(error).toLowerCase()
  return [
    '429',
    'quota',
    'rate limit',
    'rate-limit',
    'resource exhausted',
    'temporarily unavailable',
    'service unavailable',
    'overloaded',
    'timeout',
    'timed out',
    'try again later',
  ].some(fragment => message.includes(fragment))
}

function normalizeFinalProviderError(
  message: string,
  attempts: ProviderAttempt[],
  code: ProviderErrorCode = 'temporary_unavailable',
  cause?: unknown,
): AIProviderError {
  return new AIProviderError(message, code, { attempts, cause })
}

export async function runWithProviderFallback<T, TProvider extends AnyProvider>({
  providers,
  taskName,
  run,
}: {
  providers: TProvider[]
  taskName: string
  run: (provider: TProvider) => Promise<T>
}): Promise<T> {
  const attempts: ProviderAttempt[] = []
  const configuredProviders = providers.filter(provider => Boolean(getProviderApiKey(provider)))

  if (!configuredProviders.length) {
    throw normalizeFinalProviderError(
      `No AI providers are configured for ${taskName}.`,
      attempts,
      'configuration_error',
    )
  }

  for (const provider of configuredProviders) {
    try {
      return await run(provider)
    } catch (error) {
      attempts.push({ provider, message: summarizeError(error) })

      if (!isRetryableProviderError(error)) {
        throw normalizeFinalProviderError(
          `AI provider failed while running ${taskName}.`,
          attempts,
          error instanceof AIProviderError ? error.code : 'invalid_response',
          error,
        )
      }
    }
  }

  throw normalizeFinalProviderError(
    `AI is temporarily unavailable for ${taskName}.`,
    attempts,
    'temporary_unavailable',
  )
}

function createGeminiClient() {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
}

async function generateJsonWithTextProvider(
  provider: TextProvider,
  systemPrompt: string,
  userContent: string,
): Promise<unknown> {
  if (provider === 'gemini') {
    const model = createGeminiClient().getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(`${systemPrompt}\n\n${userContent}`)
    return JSON.parse(result.response.text())
  }

  const OpenAI = (await import('openai')).default

  if (provider === 'groq') {
    const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })
    return JSON.parse(completion.choices[0].message.content ?? '{}')
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })
  return JSON.parse(completion.choices[0].message.content ?? '{}')
}

export async function runStructuredTextTask<TSchema extends z.ZodTypeAny>({
  taskName,
  systemPrompt,
  userContent,
  schema,
}: {
  taskName: string
  systemPrompt: string
  userContent: string
  schema: TSchema
}): Promise<z.output<TSchema>> {
  const providerOrder = parseProviderOrder(
    process.env.AI_TEXT_PROVIDER_ORDER,
    process.env.AI_TEXT_PROVIDER,
    SUPPORTED_TEXT_PROVIDERS,
    DEFAULT_TEXT_PROVIDER_ORDER,
  )

  return runWithProviderFallback({
    providers: providerOrder,
    taskName,
    run: async provider => {
      const raw = await generateJsonWithTextProvider(provider, systemPrompt, userContent)
      const parsed = schema.safeParse(raw)

      if (!parsed.success) {
        throw new AIProviderError(
          `${provider} returned an invalid structured response for ${taskName}.`,
          'invalid_response',
          { cause: parsed.error },
        )
      }

      return parsed.data
    },
  })
}

function validateEmbeddingDimensions(provider: EmbeddingProvider, embedding: number[]): number[] {
  const expectedDimensions = GEMINI_EMBEDDING_DIMENSIONS
  const actualDimensions = embedding.length

  if (actualDimensions !== expectedDimensions) {
    throw new AIProviderError(
      `${provider} embedding dimensions (${actualDimensions}) do not match the database schema (${expectedDimensions}).`,
      'configuration_error',
    )
  }

  return embedding
}

async function generateEmbeddingWithProvider(provider: EmbeddingProvider, text: string): Promise<number[]> {
  if (provider === 'gemini') {
    const model = createGeminiClient().getGenerativeModel({ model: 'text-embedding-004' })
    const response = await model.embedContent(text)
    return validateEmbeddingDimensions(provider, response.embedding.values)
  }

  if ((OPENAI_EMBEDDING_DIMENSIONS as number) !== GEMINI_EMBEDDING_DIMENSIONS) {
    throw new AIProviderError(
      'OpenAI embeddings are disabled because the database schema expects 768 dimensions.',
      'configuration_error',
    )
  }

  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return validateEmbeddingDimensions(provider, response.data[0].embedding)
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const providerOrder = parseProviderOrder(
    process.env.AI_EMBEDDING_PROVIDER_ORDER,
    process.env.AI_EMBEDDING_PROVIDER,
    SUPPORTED_EMBEDDING_PROVIDERS,
    DEFAULT_EMBEDDING_PROVIDER_ORDER,
  )

  return runWithProviderFallback({
    providers: providerOrder,
    taskName: 'embedding generation',
    run: provider => generateEmbeddingWithProvider(provider, text),
  })
}

export function getAIErrorMessage(error: unknown): string | null {
  if (!(error instanceof AIProviderError)) {
    return null
  }

  if (error.code === 'configuration_error') {
    return 'AI is not configured correctly right now. Please contact support.'
  }

  return 'AI parsing is temporarily unavailable. Please try again shortly.'
}

export function resolveTextProviderOrder(): TextProvider[] {
  return parseProviderOrder(
    process.env.AI_TEXT_PROVIDER_ORDER,
    process.env.AI_TEXT_PROVIDER,
    SUPPORTED_TEXT_PROVIDERS,
    DEFAULT_TEXT_PROVIDER_ORDER,
  )
}

export function resolveEmbeddingProviderOrder(): EmbeddingProvider[] {
  return parseProviderOrder(
    process.env.AI_EMBEDDING_PROVIDER_ORDER,
    process.env.AI_EMBEDDING_PROVIDER,
    SUPPORTED_EMBEDDING_PROVIDERS,
    DEFAULT_EMBEDDING_PROVIDER_ORDER,
  )
}

export function assertEmbeddingDimensions(provider: EmbeddingProvider, embedding: number[]): number[] {
  return validateEmbeddingDimensions(provider, embedding)
}
