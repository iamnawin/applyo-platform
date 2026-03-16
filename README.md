# Applyo — AI-Powered Job Application Platform 

Applyo is an AI-powered job application distribution platform. Apply to 100 jobs in the time it takes to apply one.. Candidates upload one resume, set preferences, approve a curated job list, and Applyo auto-applies across Naukri, LinkedIn, and Indeed on their behalf. HR companies receive pre-scored, pre-verified profiles.

---

## What We're Building

### The Problem
Job seekers waste hours copy-pasting applications across 10+ platforms. HR teams drown in unqualified applications. The match quality is terrible on both sides.

### The Solution
- **Candidate side:** One resume upload → AI parses it → matched to live jobs → candidate approves the list → Applyo auto-applies.
- **HR side:** Only receive candidates who have been scored, matched, and self-selected for the role.

### One-Line Pitch
> "Upload your resume once. Apply everywhere. Just show up to interviews."

---

## Current Phase: MVP v1 — Smart Apply

Phase 1 scope (only what's being built now):

| Feature | Status |
|---------|--------|
| Resume upload + GPT parse → structured JSON | ✅ |
| Candidate preferences (role, city, salary, work type) | ✅ |
| AI match scoring (cosine similarity via pgvector) | ✅ |
| Approval queue UI — candidate approves before any apply | ✅ |
| Playwright auto-apply (Naukri only) | ✅ |
| Application status tracker | ✅ |
| HR dashboard (receive scored profiles) | ✅ |
| Platform admin panel | ✅ |

> **Not in v1:** Payments, Mamba encoder, background verification, fine-tuning, LinkedIn/Indeed bots.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 14 App Router (TypeScript strict) |
| Styling | TailwindCSS + shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL + pgvector |
| AI Parsing | Gemini 2.0 Flash with OpenAI/Groq fallback |
| Embeddings | Gemini text-embedding-004 (768 dims) |
| Automation | Playwright (Node.js) |
| Orchestration | n8n (self-hosted) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Storage | Supabase Storage (Resume PDFs) |
| Email | Resend |
| Hosting | Vercel |

---

## Project Structure

```
applyo/
├── app/                    # Next.js App Router pages + API routes
│   ├── (auth)/             # Login / signup
│   ├── (candidate)/        # B2C: dashboard, resume, queue, matches
│   ├── (hr)/               # B2B: HR dashboard, job posting, candidate view
│   └── api/                # REST endpoints (resume, jobs, apply, approvals)
├── components/             # React components (candidate/, hr/, shared/, ui/)
├── lib/
│   ├── ai/                 # GPT parse, embedding, match scoring
│   ├── db/                 # Supabase query layer
│   ├── schemas/            # Zod schemas for all data types
│   ├── services/           # Business logic (resume-service, match-service)
│   └── supabase/           # Server/client Supabase helpers
├── supabase/
│   ├── migrations/         # SQL migrations (pgvector, RLS, schema)
│   └── functions/          # Edge functions (parse-resume, match-jobs)
└── playwright/             # Auto-apply bots (Naukri, LinkedIn, Indeed)
```

---

## Key Business Rules

1. **NEVER auto-apply without explicit candidate approval** — every job passes through the approval queue. Legal and trust requirement.
2. **Match score shows breakdown** — Skills %, Experience %, Location %, Salary % (not just one number).
3. **Bot failures are silent to HR** — if auto-apply fails, candidate is notified; HR never sees bot internals.
4. **Candidate data is private by default** — HR can only see profiles explicitly submitted to them via matched jobs.
5. **RLS on everything** — candidates can never see other candidates' data; companies can never see other companies' candidates.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (with pgvector enabled)
- Google Gemini API key
- Optional OpenAI API key for text fallback
- Optional Groq API key for text fallback

### Setup

```bash
# Clone the repo
git clone https://github.com/iamnawin/applyo-platform.git
cd applyo-platform

# Install dependencies
npm install

# Copy env file and fill in your keys
cp .env.example .env.local

# Run database migrations
npx supabase db push

# Start dev server
npm run dev
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GOOGLE_AI_API_KEY=

# OpenAI (optional text fallback)
OPENAI_API_KEY=

# Groq (optional text fallback)
GROQ_API_KEY=

# AI provider order
AI_TEXT_PROVIDER_ORDER=gemini,openai,groq
AI_EMBEDDING_PROVIDER_ORDER=gemini

# Backward-compatible single-provider shorthands
AI_TEXT_PROVIDER=gemini
AI_EMBEDDING_PROVIDER=gemini

# Resend (email)
RESEND_API_KEY=

# n8n webhook
N8N_WEBHOOK_SECRET=

# Playwright automation service
AUTOMATION_SERVICE_URL=http://localhost:3001
AUTOMATION_API_KEY=
```

---

## Development

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run type-check   # TypeScript check (no emit)
npm run lint         # ESLint
```

## AI Provider Behavior

- Text tasks use an ordered fallback chain from `AI_TEXT_PROVIDER_ORDER`.
- Providers without configured API keys are skipped automatically.
- Retryable provider failures such as quota, rate-limit, or temporary unavailability fall through to the next configured provider.
- Embeddings are standardized on Gemini `text-embedding-004` because the current Supabase schema stores `vector(768)`.
- OpenAI embeddings are intentionally disabled until the database schema is migrated to 1536 dimensions.

---

## Roadmap

| Phase | Features |
|-------|---------|
| v1 (now) | Smart Apply — resume parse, match, approve, Naukri auto-apply |
| v2 | Payments, LinkedIn + Indeed bots, background verification |
| v3 | Mamba encoder, fine-tuned scoring, HR analytics |

---

## Partnership

Built by **ZeroOrigins AI** (Naveen)

- **AI / Backend / Prompts:** ZeroOrigins AI — Naveen
- **Frontend / Infra / Sales:**
- **IP:** ZeroOrigins retains all AI systems, prompts, and embedding logic

---

*Status: MVP v1 Active | Last updated: March 2026*
