import { matchScoreSchema } from '@/lib/schemas/application'
import type { ParsedResume, NormalizedJob, MatchScore, Preference } from '@/lib/types'
import { runStructuredTextTask } from '@/lib/ai/providers'

const SYSTEM_PROMPT = `Score how well this candidate matches the job. Consider both their skills and their explicit Preferences (salary, location, target industries, job type, etc.).
Penalize the score heavily if the job directly conflicts with their Preferences.
Return JSON: { score: 0-100, reasons: string[], pros: string[], cons: string[] }`

export async function scoreMatch(resume: ParsedResume, job: NormalizedJob, preferences?: Preference): Promise<MatchScore> {
  const userContent = `CANDIDATE RESUME:\n${JSON.stringify(resume)}\n\nCANDIDATE PREFERENCES:\n${preferences ? JSON.stringify(preferences) : 'None provided'}\n\nJOB POSTING:\n${JSON.stringify(job)}`
  return runStructuredTextTask({
    taskName: 'match scoring',
    systemPrompt: SYSTEM_PROMPT,
    userContent,
    schema: matchScoreSchema,
  })
}
