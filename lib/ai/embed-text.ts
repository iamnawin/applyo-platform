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
  // Use v1 REST API directly — text-embedding-004 is not available on v1beta
  const apiKey = process.env.GOOGLE_AI_API_KEY!
  const url = `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
  })
  if (!res.ok) throw new Error(`Gemini embed failed: ${await res.text()}`)
  const json = await res.json() as { embedding: { values: number[] } }
  return json.embedding.values
}
