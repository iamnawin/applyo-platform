import { z } from 'zod'

export const preferenceSchema = z.object({
  candidate_id: z.string().uuid(),
  desired_roles: z.array(z.string()).default([]),
  preferred_locations: z.array(z.string()).default([]),
  job_types: z.array(z.enum(['full-time', 'part-time', 'contract', 'remote'])).default([]),
  min_salary: z.number().optional(),
  max_applications_per_day: z.number().min(1).max(50).default(10),
  blacklisted_companies: z.array(z.string()).default([]),
  notify_on_match: z.boolean().default(true),
})

export type PreferenceInput = z.infer<typeof preferenceSchema>
