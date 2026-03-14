import { z } from 'zod'

export const candidateSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  created_at: z.string(),
})

export type CandidateInput = z.infer<typeof candidateSchema>
