import { generateEmbedding } from '@/lib/ai/providers'

export async function embedText(text: string): Promise<number[]> {
  return generateEmbedding(text)
}
