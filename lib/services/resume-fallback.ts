import type { ParsedResume, Resume } from '@/lib/types'
import { createResume } from '@/lib/db/resumes'

function inferNameFromStoragePath(storagePath: string): string {
  const fileName = storagePath.split('/').pop() ?? 'resume'
  return fileName.replace(/\.pdf$/i, '')
}

export function buildPendingParsedResume(storagePath: string): ParsedResume {
  return {
    name: inferNameFromStoragePath(storagePath),
    summary: 'Resume uploaded. AI parsing is pending.',
    skills: [],
    experience: [],
    education: [],
    languages: [],
  }
}

export async function storePendingResume(candidateId: string, storagePath: string): Promise<Resume> {
  const pendingResume = buildPendingParsedResume(storagePath)

  return createResume({
    candidate_id: candidateId,
    storage_path: storagePath,
    parsed_data: pendingResume,
    embedding: null,
    processing_status: 'pending_ai',
  })
}
