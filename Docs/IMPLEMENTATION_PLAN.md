# Applyo Backend - Implementation Plan

**Created:** 2026-05-22  
**Status:** In Progress  
**Goal:** Get the end-to-end pipeline working: Resume upload → AI parse → Job discovery → Match scoring → Approval → Auto-apply

---

## Architecture Overview

```
Frontend UI
  → /api/resumes/step-1-upload (PDF → Supabase Storage + text extraction)
  → /api/resumes/step-2-parse (text → FreeLLMAPI → structured JSON)
  → /api/resumes/step-3-save (save to DB + optional embedding)
  → /api/jobs/discover (Serper search → normalize → store jobs)
  → /api/matches (score candidate vs jobs via FreeLLMAPI)
  → /api/approvals (candidate approves → trigger auto-apply)
  → /api/ai/chat (general AI interactions: cover letters, explanations)
```

All AI calls go through backend only. Never expose provider keys to frontend.

---

## Environment Variables (New/Updated)

```env
# FreeLLMAPI (primary AI provider)
AI_PROVIDER=freellmapi
AI_BASE_URL=http://localhost:3001/v1
AI_API_KEY=freellmapi-your-unified-key
AI_DEFAULT_MODEL=auto
AI_TIMEOUT_MS=30000
AI_ENABLE_FREE_ROUTER=true

# Existing (kept as fallback for embeddings)
GOOGLE_AI_API_KEY=your-gemini-key
AI_TEXT_PROVIDER_ORDER=freellmapi,gemini,openai,groq
AI_EMBEDDING_PROVIDER_ORDER=gemini

# Job Discovery
SERPER_API_KEY=your-serper-key
```

---

## Task Breakdown

### Task 1: FreeLLMAPI Integration as AI Provider
- [ ] Create `lib/ai/freellmapi-client.ts`
- [ ] Add `'freellmapi'` as TextProvider in `lib/ai/providers.ts`
- [ ] Route `runStructuredTextTask` through FreeLLMAPI when configured
- [ ] Keep existing Gemini embedding path (FreeLLMAPI doesn't support embeddings yet)
- [ ] Add timeout handling (30s)
- [ ] Add env vars to `.env.local.example`

### Task 2: Database Setup Verification & Fixes
- [ ] Fix vector dimension mismatch — align code to 768 (matching DB schema)
- [ ] Add `processing_status` column to resumes if missing (migration 008)
- [ ] Verify `automation_status` + `automation_logs` on applications (migration 004)
- [ ] Ensure `resumes` storage bucket exists

### Task 3: Resume Upload + Parse Pipeline (End-to-End)
- [ ] Ensure candidate record exists before upload
- [ ] Update Step 2 to use FreeLLMAPI for parsing
- [ ] Fix Step 3: skip embedding gracefully if unavailable
- [ ] Test: upload PDF → verify parsed_data in DB

### Task 4: Job Discovery via Serper + Manual Seeding
- [ ] Create `lib/services/job-discovery-service.ts`
- [ ] Implement Serper search (query based on candidate preferences)
- [ ] Normalize job data via FreeLLMAPI
- [ ] Store in `jobs` table
- [ ] Create `/api/jobs/discover` endpoint

### Task 5: Match Scoring + Approval Queue
- [ ] Fix `generateMatchesForCandidate` to work without embeddings
- [ ] Ensure `scoreMatch` calls FreeLLMAPI and returns valid schema
- [ ] Trigger matching after job discovery

### Task 6: Auto-Apply (Greenhouse + Graceful Fallback)
- [ ] Handle "no browser available" case → mark as manual + provide link
- [ ] Connect approval → triggerApply → routeApply flow
- [ ] If BROWSER_WS_ENDPOINT not set, provide "Apply Manually" with pre-generated cover letter

### Task 7: `/api/ai/chat` Backend Route
- [ ] Create `/app/api/ai/chat/route.ts`
- [ ] Accept POST: `{ messages, context, mode }`
- [ ] Call FreeLLMAPI client
- [ ] Return normalized `{ success, content, provider?, model?, error? }`
- [ ] Graceful fallback if AI unavailable

### Task 8: End-to-End Integration Verification
- [ ] Verify auth flow: signup → callback → candidate created
- [ ] Test full pipeline: upload → parse → discover → match → approve → apply
- [ ] Ensure dashboard shows all states correctly

---

## Key Decisions

1. **FreeLLMAPI for text, Gemini for embeddings** — FreeLLMAPI doesn't support /v1/embeddings yet
2. **Serper for job discovery** — No Playwright scraping needed, works on Vercel
3. **Greenhouse as primary auto-apply target** — Only platform with real driver code
4. **Graceful degradation** — If AI/browser unavailable, app still works (manual mode)
5. **Embeddings optional for MVP** — Match scoring uses AI text comparison, not vector similarity

---

## Execution Order

1. Task 1 (FreeLLMAPI) — everything depends on AI working
2. Task 2 (DB fixes) — need correct schema
3. Task 3 (resume pipeline) — first user-facing feature
4. Tasks 4+5 (discovery + matching)
5. Task 6 (auto-apply)
6. Task 7 (AI chat route)
7. Task 8 (final verification)

---

# Applyo Hybrid Autopilot Plan

**Added:** 2026-05-30
**Status:** Accepted for implementation
**Goal:** Make Applyo's v1 differentiator a truthful hybrid autopilot: auto-apply where direct portal submission is technically possible, and provide a strong assisted-apply workspace everywhere else.

## Summary

Applyo should auto-apply only when it has a real direct job/application URL and browser automation is available. Search-result URLs such as LinkedIn `/jobs/search` or Indeed `/jobs?` are discovery links, not submission targets. Those jobs must move to assisted apply with source link, cover letter, checklist, and tracking. The app must never imply a job was submitted unless automation confirms submission or the candidate explicitly marks it applied.

## Key Changes

- Add clear user-facing states: `Auto-apply ready`, `Applying`, `Submitted`, `Needs manual apply`, `Failed`, and `Skipped`.
- Keep only `50%+` matches in candidate suggestions, approval queue, and application tracking.
- Deduplicate suggestions by canonical direct URL first, then normalized title/company/location; for fallback/search jobs dedupe by normalized role/location/source family.
- Exclude already handled jobs for the candidate from future suggestions, including pending, skipped, approved, manual, failed, and submitted applications.
- Prefer direct posting URLs from Apify/Serper/browser scraping over search fallback jobs.
- Change approval behavior:
  - Direct auto-ready jobs start automation and become `Applying`.
  - Search/manual-only jobs become `Needs manual apply`.
  - `Approve All` reports automation started, assisted apply, and failed counts separately.
- Improve the Applications page for manual items:
  - `Open Source`
  - `Generate Cover Letter`
  - `Mark Applied`
  - show automation logs/manual reason for manual and failed jobs.
- Keep AI cover letter generation when available and deterministic fallback when unavailable.
- Document production limitation: real portal-side automation on Vercel requires a configured remote browser endpoint via `BROWSER_WS_ENDPOINT`.

## API / Data Changes

- Normalize application display payloads to expose:
  - `automation_status`
  - `automation_logs`
  - `manual_reason`
  - `is_auto_apply_ready`
  - `source_url`
- Add a candidate-owned manual completion action:
  - `POST /api/applications/[id]/mark-applied`
  - only the authenticated owner candidate can call it
  - sets `status = applied` and keeps `automation_status = manual`
- Do not add destructive migrations. Keep existing backward-compatible handling for missing optional automation columns.

## Acceptance Criteria

- Salesforce Business Analyst resumes produce relevant, deduped `50%+` suggestions.
- Search fallback jobs clearly show assisted/manual apply language.
- Direct job URLs show auto-apply readiness only when browser automation is configured.
- `Applied` appears only after confirmed automation submission or explicit user mark-applied.
- Applications page tells the user exactly what happened: submitted, applying, manual action needed, skipped, or failed.
