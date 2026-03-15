# CLAUDE.md — Aplio Project Context

> This file is read by Claude Code at the start of every session.
> It is the single source of truth for how to work in this codebase.
> Do NOT delete or modify without team approval.

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

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router | TypeScript strict, RSC by default |
| Styling | TailwindCSS + shadcn/ui | Mobile-first |
| Backend | Supabase Edge Functions | Deno runtime |
| Database | Supabase PostgreSQL | pgvector extension enabled |
| Vector Search | pgvector | ANN search on embeddings |
| AI Parsing | OpenAI gpt-4o-mini | Resume + JD parsing |
| Embeddings | text-embedding-3-small | 1536 dimensions |
| Automation | Playwright (Node.js) | Separate `automation/` service |
| Orchestration | n8n (self-hosted) | Job fetch + match trigger workflows |
| Auth | Supabase Auth | Email + Google OAuth |
| Storage | Supabase Storage | Resume PDFs |
| Email | Resend | Transactional only |
| Hosting | Vercel | Frontend only |

---

## Project Structure

```
aplio/
├── CLAUDE.md                    ← YOU ARE HERE
├── README.md
├── .env.local                   ← Never commit. See .env.local.example
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                ← Supabase SSR session refresh + route protection
├── package.json
│
├── .claude/
│   └── skills/                  ← Read before touching each module
│       ├── resume-parser.md     ← AI parse pipeline
│       ├── playwright-apply.md  ← Auto-apply bot
│       ├── ai-matching.md       ← Scoring engine
│       ├── supabase-patterns.md ← DB query patterns and RLS rules
│       └── component-patterns.md← UI component conventions
│
├── docs/
│   ├── Aplio_BRD_v1.0.docx     ← Business requirements
│   ├── MEMORY.md                ← Manual session changelog
│   └── flows/
│       ├── complete user flow.excalidraw
│       └── Full AI Technical Architecture.excalidraw
│
├── app/                         ← Next.js App Router (no src/ prefix)
│   ├── layout.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   ├── callback/route.ts    ← OAuth PKCE exchange
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (marketing)/             ← Landing page
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── candidate/           ← B2C dashboard
│   │   │   ├── page.tsx
│   │   │   └── CandidateDashboardClient.tsx
│   │   └── company/             ← B2B HR dashboard
│   │       ├── page.tsx
│   │       └── CompanyDashboardClient.tsx
│   └── api/
│       ├── applications/route.ts
│       ├── approvals/route.ts   ← CORE: approval queue + auto-apply trigger
│       ├── companies/route.ts
│       ├── jobs/route.ts
│       ├── matches/route.ts
│       ├── preferences/route.ts
│       └── resumes/route.ts     ← PDF upload → parse → embed
│
├── components/
│   ├── ui/                      ← shadcn primitives (do not edit)
│   └── candidate/
│       ├── ResumeUploader.tsx
│       ├── ScoreCard.tsx
│       ├── ApprovalQueueCard.tsx
│       ├── ApplicationRow.tsx
│       └── PreferenceForm.tsx
│
├── lib/
│   ├── ai/                      ← All AI calls live here
│   │   ├── parse-resume.ts      ← READ .claude/skills/resume-parser.md first
│   │   ├── score-match.ts       ← READ .claude/skills/ai-matching.md first
│   │   ├── embed-text.ts
│   │   └── normalize-job.ts
│   ├── automation/              ← READ .claude/skills/playwright-apply.md first
│   │   ├── index.ts
│   │   ├── router.ts
│   │   └── platforms/
│   │       ├── naukri.ts
│   │       ├── linkedin.ts
│   │       └── indeed.ts
│   ├── db/                      ← All DB calls live here (READ .claude/skills/supabase-patterns.md first)
│   │   ├── client.ts            ← Service-role client (bypasses RLS for server ops)
│   │   ├── candidates.ts
│   │   ├── resumes.ts
│   │   ├── jobs.ts
│   │   ├── applications.ts
│   │   ├── preferences.ts
│   │   └── companies.ts
│   ├── schemas/                 ← Zod schemas for all API I/O
│   │   ├── candidate.ts
│   │   ├── resume.ts
│   │   ├── job.ts
│   │   ├── application.ts
│   │   ├── preference.ts
│   │   └── company.ts
│   ├── services/                ← Business logic (orchestrates db/ + ai/)
│   │   ├── match-service.ts
│   │   ├── resume-service.ts
│   │   ├── approval-service.ts
│   │   ├── application-service.ts
│   │   ├── job-service.ts
│   │   └── company-service.ts
│   ├── supabase/                ← Auth-aware SSR clients (cookie-based)
│   │   ├── client.ts            ← Browser client (use in Client Components)
│   │   └── server.ts            ← Server client (use in Server Components / API routes)
│   ├── types/
│   │   ├── database.ts          ← Generated Supabase types
│   │   └── index.ts
│   └── utils/
│       └── index.ts             ← cn() and other shared helpers
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_indexes.sql
│   └── functions/
│       ├── parse-resume/
│       ├── route-application/
│       └── score-candidate/
│
└── playwright/
    └── playwright.config.ts
    ├── runner.ts
    └── platforms/
        ├── naukri.ts
        ├── linkedin.ts
        └── indeed.ts
```

---

## Coding Rules — ALWAYS Follow

### TypeScript
- Strict mode ON — no `any`, no `as unknown`
- All API responses typed with Zod schemas in `src/types/`
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
# .env.example — copy to .env.local and fill in

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Resend (email)
RESEND_API_KEY=

# n8n webhook secret
N8N_WEBHOOK_SECRET=

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

All system prompts live in `src/lib/ai/prompts/`.
If you modify a prompt, you MUST:
1. Comment the change with date and reason
2. Re-run the prompt test suite: `npm run test:prompts`
3. Compare output quality on 10 sample resumes before committing

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
