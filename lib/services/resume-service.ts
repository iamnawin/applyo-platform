import { parseResume } from '@/lib/ai/parse-resume'
import { embedText } from '@/lib/ai/embed-text'
import { createResume } from '@/lib/db/resumes'
import type { Resume } from '@/lib/types'

export async function parseAndStore(candidateId: string, pdfText: string, storagePath: string): Promise<Resume> {
  const parsed = await parseResume(pdfText)
  const embedding = await embedText(JSON.stringify(parsed.skills) + ' ' + parsed.summary)
  return createResume({
    candidate_id: candidateId,
    storage_path: storagePath,
    parsed_data: parsed,
    embedding,
    processing_status: 'ready',
  })
}
