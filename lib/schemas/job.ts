import { z } from 'zod'

export const normalizedJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'remote']).optional(),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().optional(),
  salary_range: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }).nullable().default(null),
  description_summary: z.string().optional(),
})

export type NormalizedJob = z.infer<typeof normalizedJobSchema>
