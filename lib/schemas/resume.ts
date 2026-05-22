import { z } from 'zod'

// ── Chunk 1: Basic profile fields (fast) ────────────────────────────────────
export const parsedResumeProfileSchema = z.object({
  name: z.string().catch(''),
  email: z.string().optional().catch(undefined),
  phone: z.string().optional().catch(undefined),
  location: z.string().optional().catch(undefined),
  summary: z.string().optional().catch(undefined),
  languages: z.array(z.string()).default([]).catch([]),
})

// ── Chunk 2: Work experience (moderate) ─────────────────────────────────────
export const parsedResumeExperienceSchema = z.object({
  experience: z.array(z.object({
    title: z.string().nullable().transform(v => v ?? ''),
    company: z.string().nullable().transform(v => v ?? ''),
    start: z.string().nullable().optional().transform(v => v ?? undefined),
    end: z.string().nullable().optional().transform(v => v ?? undefined),
    description: z.string().nullable().optional().transform(v => v ?? undefined),
  })).default([]).catch([]),
})

// ── Chunk 3: Education + skills (fast) ──────────────────────────────────────
export const parsedResumeEducationSkillsSchema = z.object({
  skills: z.array(z.string()).default([]).catch([]),
  education: z.array(z.object({
    degree: z.string().nullable().transform(v => v ?? ''),
    institution: z.string().nullable().transform(v => v ?? ''),
    year: z.string().nullable().optional().transform(v => v ?? undefined),
  })).default([]).catch([]),
})

// ── Legacy combined schema (used by other code that imports the old type) ────
export const parsedResumeSchema = parsedResumeProfileSchema
  .merge(parsedResumeExperienceSchema)
  .merge(parsedResumeEducationSkillsSchema)

export type ParsedResume = z.infer<typeof parsedResumeSchema>
