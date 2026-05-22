# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Single source of truth for how to work in this codebase. Do NOT delete or modify without team approval.

---

## What Is Aplio?

**Aplio** is an AI-powered job application distribution platform.
Think **DistroKid for jobs** — candidates upload one resume, set preferences,
approve a curated job list, and Aplio auto-applies across Naukri, LinkedIn,
Indeed on their behalf. HR companies receive pre-scored, pre-verified profiles.

**One-line pitch:**
> "Upload your resume once. Apply everywhere. Just show up to interviews."

**Partnership:** ZeroOrigins AI (Naveen)

---

## Current Phase

**MVP v1 — Smart Apply**

Only build what is listed under Phase 1 in the BRD.
Do NOT build payment, Mamba encoder, background verification, or fine-tuning
infrastructure. Those are v2/v3.

Phase 1 scope:
- Resume upload + GPT parse → structured JSON
- Candidate preferences (role, city, salary, work type)
- AI match scoring (cosine similarity via pgvector)
- Approval queue UI
- Playwright auto-apply (Naukri only for now)
- Application status tracker
- Basic HR dashboard (receive scored profiles)
- Platform admin panel (user list + bot health)

---

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run type-check   # TypeScript check (no emit)
npm run lint         # ESLint
npm run test:ai      # Run AI provider tests (node --test, sequential)
```

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router | TypeScript strict, RSC by default |
| Styling | TailwindCSS + shadcn/ui | Mobile-first |
| Backend | Supabase Edge Functions | Deno runtime |
| Database | Supabase PostgreSQL | pgvector extension enabled |
| AI Text | Gemini 2.0 Flash (primary) → OpenAI gpt-4o-mini → Groq llama-3.3-70b | Priority order |
| AI Embeddings | Gemini text-embedding-004 (768-dim padded to 1536) | Stored in pgvector column |
| Automation | Playwright (Node.js) | `playwright/` directory |
| Auth | Supabase Auth | Email + Google OAuth |
| Storage | Supabase Storage | Resume PDFs in `resumes` bucket |
| Hosting | Vercel | Frontend only |

---

## Architecture

### Resume Upload Pipeline (3-step to avoid Vercel timeouts)

The frontend (`ResumeUploader.tsx`) calls three sequential API routes:

1. **`/api/resumes/step-1-upload`** — Uploads PDF to Supabase Storage, extracts raw text via `pdf-parse`. Fast (~2s). Returns `{ text, fileName }`.
2. **`/api/resumes/step-2-parse`** — Sends raw text to AI, gets structured JSON. Has `maxDuration = 60`. Returns `{ parsedData }`.
3. **`/api/resumes/step-3-save`** — Generates embedding (optional, silently skipped on failure), inserts to DB, triggers match generation. Returns `{ resume }`.

### AI Provider Layer (`lib/ai/providers.ts`)

Central abstraction for all AI calls. Key exports:
- `runStructuredTextTask({ taskName, systemPrompt, userContent, schema })` — calls text providers in priority order, validates output against Zod schema
- `generateEmbedding(text)` — generates 1536-dim vector (Gemini 768-dim padded with zeros)
- `runWithProviderFallback({ providers, taskName, run, maxRetries })` — retry with exponential backoff (2s/4s/8s), falls back to next provider after exhausting retries

Provider priority is controlled by env vars:
- `AI_TEXT_PROVIDER_ORDER=gemini,openai,groq` (default order)
- `AI_EMBEDDING_PROVIDER_ORDER=gemini` (default)

Resume parsing also has a regex fallback (`lib/ai/parse-resume-fallback.ts`) that always succeeds if all AI providers fail.

### Key Layer Boundaries

- All AI calls → `lib/ai/` (never call provider SDKs from components or API routes directly)
- All DB calls → `lib/db/` (never call Supabase from components)
- Business logic → `lib/services/` (orchestrates `db/` + `ai/`)
- Auth-aware SSR client → `lib/supabase/server.ts`; browser client → `lib/supabase/client.ts`
- Zod schemas for all API I/O → `lib/schemas/`

---

## Coding Rules — ALWAYS Follow

### TypeScript
- Strict mode ON — no `any`, no `as unknown`
- All API responses typed with Zod schemas in `lib/schemas/`
- Use `satisfies` over `as` for type assertions

### Architecture
- **Server Components by default** — only add `"use client"` when you need hooks/events
- **All AI calls go through `src/lib/ai/`** — never call OpenAI directly from a component or page
- **All DB calls go through `src/lib/db/`** — never call Supabase directly from a component
- **All env vars via `process.env.VARIABLE_NAME`** — never hardcode secrets
- **Error boundaries on all async operations** — use try/catch, return structured errors

### Components
- Use shadcn/ui primitives — do not write raw HTML form elements
- Mobile-first — design for 375px width first, then scale up
- Loading states required on all async actions (use `LoadingSpinner`)
- Never mutate props — all state management via React state or Supabase Realtime

### Database
- **Always use RLS** — every table has row-level security enabled
- **Never raw SQL in components** — all queries in `src/lib/db/`
- **Always handle null** — Supabase returns null for missing rows, not undefined
- Use transactions for multi-table writes

### Git
- Branch naming: `feature/uc-01-resume-upload`, `fix/match-score-accuracy`
- Commit format: `feat(resume): add PDF parser with GPT-4o-mini`
- Never commit `.env.local`, never commit node_modules

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers (Gemini is primary — required; others are fallbacks)
GOOGLE_AI_API_KEY=        # Gemini text + embeddings
OPENAI_API_KEY=           # Fallback text provider
GROQ_API_KEY=             # Fallback text provider

# Override provider order (optional)
AI_TEXT_PROVIDER_ORDER=gemini,openai,groq
AI_EMBEDDING_PROVIDER_ORDER=gemini

# Resend (email)
RESEND_API_KEY=

# Automation service URL (Playwright runner)
AUTOMATION_SERVICE_URL=http://localhost:3001
AUTOMATION_API_KEY=
```

---

## Key Business Rules

1. **NEVER auto-apply without explicit candidate approval** — every job must pass through the approval queue first. This is a legal and trust requirement.

2. **Match score must show breakdown** — candidates see Skills %, Experience %, Location %, Salary %, not just a single number.

3. **Bot failures are silent to HR** — if auto-apply fails, candidate is notified, HR never knows. Never surface bot internals to B2B users.

4. **Candidate data is private by default** — HR can only see profiles that candidates have explicitly submitted to them (via matched jobs). No bulk browsing of candidate pool.

5. **RLS on everything** — a candidate should NEVER be able to see another candidate's data. A company should NEVER see another company's candidates.

6. **IP ownership** — ZeroOrigins retains all AI systems, prompts, embedding logic. Never move AI code to Viralbug-controlled repos without legal sign-off.

---

## AI Prompts — Governance

System prompts are inline in `lib/ai/` functions (e.g., `parse-resume.ts`).
If you modify a prompt:
1. Comment the change with date and reason
2. Run `npm run test:ai` to verify the provider layer still works
3. Compare output quality on sample resumes before committing

Prompts are considered IP — treat them with the same care as proprietary code.

---

## Current Known Issues / TODOs

Track all issues in Jira. Below are items that affect day-to-day development:

- [ ] Naukri bot fails on 2FA-enabled accounts — skip these for now
- [ ] Resume parsing accuracy drops on Telugu/Hindi resumes — needs prompt tuning
- [ ] pgvector ANN index needs to be rebuilt after every 1000 new embeddings
- [ ] n8n job-fetcher workflow rate-limited by Naukri after 500 requests/hour

---

## Skill Files — When To Use

Before working on any module, read the corresponding skill file in `.claude/skills/`:

| Module | Skill File |
|---|---|
| Resume parsing, GPT prompts | `resume-parser.md` |
| Playwright auto-apply bots | `playwright-apply.md` |
| Match scoring, embeddings | `ai-matching.md` |
| Supabase queries, RLS, migrations | `supabase-patterns.md` |
| React components, shadcn, Tailwind | `component-patterns.md` |

---

## Contact

- **AI / Backend / Prompts:** Naveen (ZeroOrigins AI)
- **Frontend / Infra / Sales:** Viralbug team
- **Legal / IP queries:** Naveen only

---

*Last updated: March 2026 | Version: 1.0 | Status: MVP v1 Active*
