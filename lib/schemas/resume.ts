import { z } from 'zod'

export const parsedResumeSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    title: z.string().nullable().transform(v => v ?? ''),
    company: z.string().nullable().transform(v => v ?? ''),
    start: z.string().nullable().optional().transform(v => v ?? undefined),
    end: z.string().nullable().optional().transform(v => v ?? undefined),
    description: z.string().nullable().optional().transform(v => v ?? undefined),
  })).default([]),
  education: z.array(z.object({
    degree: z.string().nullable().transform(v => v ?? ''),
    institution: z.string().nullable().transform(v => v ?? ''),
    year: z.string().nullable().optional().transform(v => v ?? undefined),
  })).default([]),
  languages: z.array(z.string()).default([]),
})

export type ParsedResume = z.infer<typeof parsedResumeSchema>
