# Aplio — Session Memory & Change Log

> Last updated: 2026-03-13
> Use this file to track what was built, what was fixed, and what's next.

---

## Project Overview

**Aplio** — AI-powered job application distribution platform (DistroKid for jobs).
Candidates upload one resume → AI matches jobs → candidate approves → Aplio auto-applies.

**Stack:** Next.js 14 App Router · Supabase · pgvector · OpenAI gpt-4o-mini · Playwright · n8n
**Phase:** MVP v1 (Smart Apply) — see `CLAUDE.md` for full scope

---

## Files Created This Session (2026-03-13)

### Infrastructure / Auth
| File | What it does |
|------|-------------|
| `middleware.ts` | Session refresh via `@supabase/ssr` + route protection (redirects `/dashboard`, `/queue` etc. to `/login` if unauthed) |
| `lib/supabase/client.ts` | Browser Supabase client using `createBrowserClient` from `@supabase/ssr` |
| `lib/supabase/server.ts` | Server/RSC Supabase client using `createServerClient` from `@supabase/ssr` (cookie-aware) |
| `app/(auth)/callback/route.ts` | OAuth PKCE callback — exchanges code for session, redirects to `/dashboard/candidate` |

### Auth Pages
| File | What it does |
|------|-------------|
| `app/(auth)/login/page.tsx` | Full login form — email/password + Google OAuth via Supabase |
| `app/(auth)/signup/page.tsx` | Registration form — full name, email, password, role selector (Job Seeker / HR) |

### UI Base Components (shadcn-style)
| File | Notes |
|------|-------|
| `components/ui/button.tsx` | CVA-based, variants: default/destructive/outline/secondary/ghost/link |
| `components/ui/input.tsx` | Standard text input |
| `components/ui/label.tsx` | Radix label primitive |
| `components/ui/card.tsx` | Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter |
| `components/ui/badge.tsx` | Variants: default/secondary/destructive/outline/success/warning |
| `components/ui/progress.tsx` | Radix progress bar |
| `components/ui/separator.tsx` | Radix separator (horizontal/vertical) |

### Candidate Components
| File | What it does |
|------|-------------|
| `components/candidate/ResumeUploader.tsx` | Drag-and-drop PDF upload → calls `POST /api/resumes` → shows parse status |
| `components/candidate/PreferenceForm.tsx` | Tag-based form for roles, locations, job types, salary, blacklisted companies, daily limit |
| `components/candidate/ScoreCard.tsx` | 4-bar match breakdown — Skills / Experience / Location / Salary |
| `components/candidate/ApprovalQueueCard.tsx` | Per-job approval card with Approve/Skip buttons → calls `POST /api/approvals` |
| `components/candidate/ApplicationRow.tsx` | Status tracker row for applied/interview/rejected jobs |

### Candidate Dashboard
| File | What it does |
|------|-------------|
| `app/dashboard/candidate/page.tsx` | Server component — auth-gated, fetches candidate + resumes, renders client dashboard |
| `app/dashboard/candidate/CandidateDashboardClient.tsx` | Full sidebar dashboard — tabs: Overview / Resume / Preferences / Queue / Applications |

### Company (HR) Dashboard
| File | What it does |
|------|-------------|
| `app/dashboard/company/page.tsx` | Server component — auth-gated |
| `app/dashboard/company/CompanyDashboardClient.tsx` | HR sidebar dashboard — tabs: Overview / Job Postings / Candidates |

### API Routes (implemented)
| Route | Method | What it does |
|-------|--------|-------------|
| `app/api/resumes/route.ts` | POST | Upload PDF → Supabase Storage → pdf-parse → GPT parse → embed → store |
| `app/api/resumes/route.ts` | GET | List resumes for current candidate |
| `app/api/approvals/route.ts` | GET | List pending applications for current candidate |
| `app/api/approvals/route.ts` | POST | Approve or skip a pending match; if approved, fire-and-forget to automation service |
| `app/api/applications/route.ts` | GET | Application status tracker (all non-pending applications) |

---

## Bugs Fixed (2026-03-13)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `PreferenceForm` sent `POST` but API route only had `PUT` | `app/api/preferences/route.ts` | Changed `PUT` → `POST` |
| 2 | `ApprovalQueueCard` used `normalized.job_type` — field doesn't exist in `NormalizedJob` schema | `components/candidate/ApprovalQueueCard.tsx` | Changed to `normalized.type` |
| 3 | `ApprovalQueueCard` used `normalized.salary` — schema has `salary_range: {min, max, currency}` | `components/candidate/ApprovalQueueCard.tsx` | Changed to `normalized.salary_range` with proper display |
| 4 | `ApprovalQueueCard` used `normalized.required_skills` — schema field is `skills` | `components/candidate/ApprovalQueueCard.tsx` | Changed to `normalized.skills` |

---

## Key Architecture Decisions

### Import Conventions
- **Server components / API routes** → `import { createClient } from '@/lib/supabase/server'`
- **Client components** → `import { createClient } from '@/lib/supabase/client'`
- **DB queries** → `import { createServerClient } from '@/lib/db/client'` (uses service role key)
- **`cn()` helper** → `import { cn } from '@/lib/utils'` (resolves to `lib/utils/index.ts`)

### Business Rule: Approval is Mandatory
`POST /api/approvals` only fires the automation service **after** the candidate explicitly approves.
Auto-apply without approval is **never** permitted (legal + trust requirement).

### Bot Failures Are Silent
The automation trigger in `/api/approvals` is fire-and-forget (`.catch(() => {})`).
HR users never see bot errors — only the candidate is notified on failure.

---

## NormalizedJob Schema Reference
```ts
// lib/schemas/job.ts
{
  title: string
  company: string
  location?: string
  type?: 'full-time' | 'part-time' | 'contract' | 'remote'   // ← NOT job_type
  skills: string[]                                             // ← NOT required_skills
  experience_years?: number
  salary_range: { min: number; max: number; currency: string } | null  // ← NOT salary
  description_summary?: string
}
```

---

## What Still Needs Building

### API Routes (still stub / 501)
- [ ] `POST /api/preferences` — save candidate preferences to DB
- [ ] `GET /api/preferences` — load existing preferences
- [ ] `POST /api/jobs` — HR posts a new job description
- [ ] `GET /api/jobs` — list jobs for company
- [ ] `POST /api/matches` — trigger AI matching for a candidate
- [ ] `GET /api/companies/candidates` — HR pipeline (candidates who applied to company's jobs)
- [ ] `app/(auth)/callback` — already built ✓

### Pages Still Stubbed
- [ ] `app/(marketing)/page.tsx` — landing page (currently just placeholder)
- [ ] `app/(auth)/layout.tsx` — auth layout (currently empty)
- [ ] Company candidate detail page: `/dashboard/company/candidates/[id]`

### Database
- [ ] Run `supabase/migrations/001_init.sql` and `002_indexes.sql`
- [ ] Create Supabase Storage bucket named `resumes`
- [ ] Enable pgvector extension
- [ ] Set up RLS policies (migration `003_rls_policies.sql` — not yet created)

### Services Not Yet Connected
- [ ] `lib/ai/score-match.ts` — needs to return 4-dimension breakdown (Skills%, Exp%, Location%, Salary%) instead of single score
- [ ] `lib/services/approval-service.ts` — `processApproval` has empty `candidate_id` bug (line 7)
- [ ] n8n job-fetcher workflow — not yet configured
- [ ] Playwright automation runner (`automation/`) — scaffold exists, not tested

---

## CrewAI Research Notes (2026-03-13)
Reviewed 3 CrewAI repos: `job-posting`, `recruitment`, `match_profile_to_positions`.

**Decision: Don't adopt CrewAI for Aplio.**
- Our pgvector + GPT pipeline is simpler and more controllable
- Multi-agent loops add latency incompatible with real-time API responses
- Playwright automation needs deterministic control, not agent negotiation

**Borrow these patterns conceptually:**
- Recruitment Matcher agent → expand `score-match.ts` to return 4-dimension breakdown
- Match Profile crew → our parse-resume + embed pipeline already implements this correctly
