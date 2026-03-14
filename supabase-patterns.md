# SKILL: Supabase Patterns
# File: .claude/skills/supabase-patterns.md
# Use this before working on: src/lib/db/*, supabase/migrations/*

---

## Golden Rules

1. ALL DB queries go in `src/lib/db/` — never in components or pages
2. ALL tables have RLS enabled — users can only see their own data
3. ALWAYS handle null — Supabase returns null, not undefined
4. ALWAYS use the server client for mutations, browser client for subscriptions
5. NEVER use service_role key on the client side — server-only

---

## Client Setup

```typescript
// src/lib/utils/supabase.ts

import { createServerClient, createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // generated types

// Server-side (API routes, Server Components, Edge Functions)
export function createSupabaseServer() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // full access — server only
    { cookies: { /* cookie handlers */ } }
  );
}

// Client-side (Client Components, Realtime subscriptions)
export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // RLS enforced
  );
}
```

---

## Query Patterns

### Select with type safety
```typescript
// src/lib/db/candidates.ts

export async function getCandidateByUserId(userId: string) {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from('candidates')
    .select(`
      *,
      resumes (id, parsed_json, created_at),
      preferences (*)
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('getCandidateByUserId error:', error);
    return null;
  }
  return data;
}
```

### Insert with return
```typescript
export async function createCandidate(userId: string, profileJson: ParsedResume) {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      user_id: userId,
      profile_json: profileJson,
      score: profileJson.resume_quality_score,
    })
    .select()
    .single();

  if (error) throw new Error(`createCandidate failed: ${error.message}`);
  return data;
}
```

### Update
```typescript
export async function updateApplicationStatus(
  applicationId: string,
  status: 'applied' | 'viewed' | 'interview' | 'offer' | 'rejected'
) {
  const supabase = createSupabaseServer();

  const { error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) throw new Error(`updateApplicationStatus: ${error.message}`);
}
```

### Realtime subscription (client component)
```typescript
// Use in Client Components only
import { createSupabaseBrowser } from '@/lib/utils/supabase';

useEffect(() => {
  const supabase = createSupabaseBrowser();
  const channel = supabase
    .channel('applications')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'applications',
      filter: `candidate_id=eq.${candidateId}`,
    }, (payload) => {
      // handle update
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [candidateId]);
```

---

## RLS Policies (Key Patterns)

```sql
-- supabase/migrations/003_rls_policies.sql

-- Candidates can only see their own data
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_own_data" ON candidates
  FOR ALL USING (user_id = auth.uid());

-- Resumes: candidate sees own, HR sees resumes of candidates who applied
CREATE POLICY "resumes_candidate_own" ON resumes
  FOR ALL USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "resumes_hr_can_view_applicants" ON resumes
  FOR SELECT USING (
    candidate_id IN (
      SELECT candidate_id FROM applications
      WHERE job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Jobs: anyone can read, only company members can write
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT USING (is_active = true);

CREATE POLICY "jobs_company_write" ON jobs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Applications: candidate sees own, HR sees applications to their jobs
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_candidate_own" ON applications
  FOR ALL USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "applications_hr_view" ON applications
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );
```

---

## Migration Conventions

- One concern per migration file
- Never edit old migration files — always create new ones
- Naming: `NNN_description.sql` (e.g., `004_add_bgv_table.sql`)
- Always include rollback comment at top of file
- Test migrations on local Supabase before pushing

```bash
# Local dev
supabase start
supabase db reset  # applies all migrations fresh

# Push to staging
supabase db push --linked

# Generate TypeScript types after schema changes
supabase gen types typescript --linked > src/types/supabase.ts
```

---

## Storage Patterns (Resume Files)

```typescript
// Upload resume to Supabase Storage
export async function uploadResumeFile(
  candidateId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  const supabase = createSupabaseServer();

  const ext = file.name.split('.').pop();
  const path = `resumes/${candidateId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('candidate-files')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('uploadResumeFile error:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('candidate-files')
    .getPublicUrl(path);

  return { url: data.publicUrl, path };
}
```

Storage bucket rules — set in Supabase dashboard:
- `candidate-files`: private, authenticated users only
- Candidates can only upload to their own `resumes/{candidate_id}/` path

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `row-level security policy violation` | Wrong client (using anon on server) | Use service_role client for server mutations |
| `null` returned instead of data | Row doesn't exist | Always check for null before using data |
| `unique constraint violation` | Duplicate insert | Use `.upsert()` with `onConflict` |
| `foreign key violation` | Parent row missing | Ensure user/candidate created before dependent rows |
| Realtime not firing | Channel not subscribed | Check `.subscribe()` was called, check RLS allows SELECT |
