import { getApplicationsByCandidateId } from '@/lib/db/applications'
import type { Application } from '@/lib/types'

export async function getApplicationStatus(candidateId: string): Promise<Application[]> {
  return getApplicationsByCandidateId(candidateId)
}
