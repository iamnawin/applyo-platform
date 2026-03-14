import { z } from 'zod'

export const parsedResumeSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.string().optional(),
  })).default([]),
  languages: z.array(z.string()).default([]),
})

export type ParsedResume = z.infer<typeof parsedResumeSchema>
