import { z } from 'zod'

export const matchScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  strongPoints: z.array(z.string()).default([]),
})

export const approvalActionSchema = z.object({
  matchId: z.string().uuid(),
  action: z.enum(['approve', 'skip', 'modify']),
  modification: z.string().optional(),
})

export type MatchScore = z.infer<typeof matchScoreSchema>
export type ApprovalAction = z.infer<typeof approvalActionSchema>
