import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AIProviderError,
  assertEmbeddingDimensions,
  isRetryableProviderError,
  resolveEmbeddingProviderOrder,
  resolveTextProviderOrder,
  runWithProviderFallback,
} from './providers.ts'

function withEnv(updates: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  const result = fn()

  if (result instanceof Promise) {
    return result.finally(() => {
      for (const [key, value] of Array.from(previous.entries())) {
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      }
    })
  }

  for (const [key, value] of Array.from(previous.entries())) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

test('resolveTextProviderOrder prefers ordered config and deduplicates', () => {
  withEnv(
    {
      AI_TEXT_PROVIDER_ORDER: 'groq,openai,groq,gemini',
      AI_TEXT_PROVIDER: 'openai',
    },
    () => {
      assert.deepEqual(resolveTextProviderOrder(), ['groq', 'openai', 'gemini'])
    },
  )
})

test('runWithProviderFallback returns first successful provider result', async () => {
  await withEnv(
    {
      GOOGLE_AI_API_KEY: 'gemini-key',
      OPENAI_API_KEY: 'openai-key',
    },
    async () => {
      const result = await runWithProviderFallback({
        providers: ['gemini', 'openai'] as const,
        taskName: 'test task',
        run: async provider => `${provider}-success`,
      })

      assert.equal(result, 'gemini-success')
    },
  )
})

test('runWithProviderFallback retries the next provider after retryable failure', async () => {
  await withEnv(
    {
      GOOGLE_AI_API_KEY: 'gemini-key',
      OPENAI_API_KEY: 'openai-key',
    },
    async () => {
      const calls: string[] = []
      const result = await runWithProviderFallback({
        providers: ['gemini', 'openai'] as const,
        taskName: 'test task',
        run: async provider => {
          calls.push(provider)
          if (provider === 'gemini') {
            throw new AIProviderError('Quota exceeded', 'temporary_unavailable')
          }
          return 'openai-success'
        },
      })

      assert.equal(result, 'openai-success')
      assert.deepEqual(calls, ['gemini', 'openai'])
    },
  )
})

test('runWithProviderFallback skips providers without configured keys', async () => {
  await withEnv(
    {
      GOOGLE_AI_API_KEY: undefined,
      OPENAI_API_KEY: 'openai-key',
    },
    async () => {
      const calls: string[] = []
      const result = await runWithProviderFallback({
        providers: ['gemini', 'openai'] as const,
        taskName: 'test task',
        run: async provider => {
          calls.push(provider)
          return provider
        },
      })

      assert.equal(result, 'openai')
      assert.deepEqual(calls, ['openai'])
    },
  )
})

test('runWithProviderFallback throws normalized error when all providers fail', async () => {
  await withEnv(
    {
      GOOGLE_AI_API_KEY: 'gemini-key',
      OPENAI_API_KEY: 'openai-key',
    },
    async () => {
      await assert.rejects(
        () =>
          runWithProviderFallback({
            providers: ['gemini', 'openai'] as const,
            taskName: 'test task',
            run: async provider => {
              throw new AIProviderError(`${provider} unavailable`, 'temporary_unavailable')
            },
          }),
        (error: unknown) => {
          assert.ok(error instanceof AIProviderError)
          assert.equal(error.code, 'temporary_unavailable')
          assert.equal(error.attempts.length, 2)
          return true
        },
      )
    },
  )
})

test('resolveEmbeddingProviderOrder keeps gemini as default', () => {
  withEnv(
    {
      AI_EMBEDDING_PROVIDER_ORDER: undefined,
      AI_EMBEDDING_PROVIDER: undefined,
    },
    () => {
      assert.deepEqual(resolveEmbeddingProviderOrder(), ['gemini'])
    },
  )
})

test('assertEmbeddingDimensions rejects mismatched vectors', () => {
  assert.throws(
    () => assertEmbeddingDimensions('openai', new Array(1536).fill(0)),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError)
      assert.equal(error.code, 'configuration_error')
      return true
    },
  )
})

test('isRetryableProviderError recognizes quota-style failures', () => {
  assert.equal(isRetryableProviderError(new Error('429 you exceeded your current quota')), true)
  assert.equal(isRetryableProviderError(new Error('schema validation failed')), false)
})
