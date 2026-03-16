import { matchScoreSchema } from '@/lib/schemas/application'
import type { ParsedResume, NormalizedJob, MatchScore } from '@/lib/types'
import { runStructuredTextTask } from '@/lib/ai/providers'

const SYSTEM_PROMPT = `Score how well this candidate matches the job. Return JSON:
  { score: 0-100, reasons: string[], missingSkills: string[], strongPoints: string[] }`

export async function scoreMatch(resume: ParsedResume, job: NormalizedJob): Promise<MatchScore> {
  const userContent = `CANDIDATE:\n${JSON.stringify(resume)}\n\nJOB:\n${JSON.stringify(job)}`
  return runStructuredTextTask({
    taskName: 'match scoring',
    systemPrompt: SYSTEM_PROMPT,
    userContent,
    schema: matchScoreSchema,
  })
}
