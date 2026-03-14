import { z } from 'zod'

export const companySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  created_at: z.string(),
})

export type CompanyInput = z.infer<typeof companySchema>
