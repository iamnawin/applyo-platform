import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini text-embedding-004 produces 768-dim vectors (matches DB schema)
// Switch AI_EMBEDDING_PROVIDER=openai in env to use OpenAI text-embedding-3-small (1536-dim)
const provider = process.env.AI_EMBEDDING_PROVIDER ?? 'gemini'

export async function embedText(text: string): Promise<number[]> {
  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  }

  // Default: Gemini
  // Fallback to OpenAI if Gemini embedding not configured
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}
