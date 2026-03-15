# SKILL: AI Matching Engine
# File: .claude/skills/ai-matching.md
# Use this before working on: src/lib/ai/embed.ts, src/lib/ai/match.ts

---

## What This Module Does

Takes a candidate's parsed resume and matches it against job listings using
vector embeddings and cosine similarity — stored and queried via pgvector in Supabase.

This is the core AI feature of Aplio. It must be:
- Fast (< 2 seconds to return top 20 matches)
- Accurate (candidates should agree with match scores 80%+ of the time)
- Explainable (every score has a breakdown, not just a number)
- Cheap (pre-computed embeddings, not LLM calls on every match)

---

## The Full Pipeline

```
CANDIDATE SIDE:
  ParsedResume JSON
    → build embedding text (see below)
    → text-embedding-3-small → vector[1536]
    → store in resumes.embedding (pgvector)
    → store in candidates.career_vector

JOB SIDE (runs daily via n8n):
  JD raw text
    → GPT-4o-mini parse → JD JSON
    → build embedding text
    → text-embedding-3-small → vector[1536]
    → store in jobs.embedding

MATCHING (on demand or nightly):
  candidate.career_vector
    → pgvector ANN search → top 50 jobs by cosine similarity
    → for each top 50: compute detailed breakdown score
    → store in matches table
    → surface top 20 in approval queue
```

---

## Embedding Text Construction

Do NOT embed raw resume text. Build a structured embedding string.
This dramatically improves matching quality.

```typescript
// src/lib/ai/embed.ts

export function buildCandidateEmbeddingText(resume: ParsedResume): string {
  const roles = resume.experience.map(e => `${e.role} at ${e.company}`).join(', ');
  const skills = [
    ...resume.skills.technical,
    ...resume.skills.tools,
    ...resume.skills.languages,
  ].join(', ');
  const education = resume.education.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join(', ');
  const certs = resume.certifications.map(c => c.name).join(', ');

  return `
    Professional: ${resume.personal.full_name}
    Seniority: ${resume.seniority_level}
    Domain: ${resume.primary_domain}
    Total Experience: ${Math.floor(resume.total_experience_months / 12)} years
    Roles: ${roles}
    Skills: ${skills}
    Education: ${education}
    Certifications: ${certs}
    Summary: ${resume.summary || ''}
  `.trim();
}

export function buildJDEmbeddingText(jd: ParsedJD): string {
  const mustHaves = jd.requirements.must_have.join(', ');
  const niceHaves = jd.requirements.nice_to_have.join(', ');

  return `
    Role: ${jd.title}
    Company: ${jd.company}
    Seniority Required: ${jd.seniority_required}
    Domain: ${jd.domain}
    Experience Required: ${jd.experience_years_min}-${jd.experience_years_max} years
    Must Have: ${mustHaves}
    Nice to Have: ${niceHaves}
    Location: ${jd.location}
    Work Type: ${jd.work_type}
  `.trim();
}
```

---

## The Embedding Function

```typescript
// src/lib/ai/embed.ts

import { openai } from '@/lib/utils/openai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),  // max 8192 tokens — truncate if needed
    dimensions: 1536,
  });
  return response.data[0].embedding;
}
```

Cost: $0.00002 per 1K tokens. A resume = ~500 tokens = $0.00001. Negligible.

---

## pgvector Setup (Migration)

```sql
-- supabase/migrations/002_pgvector.sql

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns
ALTER TABLE resumes ADD COLUMN embedding vector(1536);
ALTER TABLE jobs ADD COLUMN embedding vector(1536);

-- Create ANN index (IVFFlat — good up to ~1M rows)
CREATE INDEX idx_resumes_embedding ON resumes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_jobs_embedding ON jobs
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- IMPORTANT: Rebuild index after every 1000 new rows
-- Run: REINDEX INDEX idx_jobs_embedding;
```

---

## The Match Function

```typescript
// src/lib/ai/match.ts

import { supabaseServer } from '@/lib/utils/supabase';

export interface MatchResult {
  job_id: string;
  overall_score: number;     // 0-100
  breakdown: {
    skills_match: number;    // 0-100
    experience_match: number;
    location_match: number;
    salary_match: number;
    domain_match: number;
  };
  missing_skills: string[];
  matching_skills: string[];
}

// Step 1: Fast ANN search via pgvector (no LLM)
export async function findTopMatches(
  candidateEmbedding: number[],
  limit = 50
): Promise<{ job_id: string; cosine_score: number }[]> {

  const { data, error } = await supabaseServer.rpc('match_jobs', {
    query_embedding: candidateEmbedding,
    match_threshold: 0.5,
    match_count: limit,
  });

  if (error) throw error;
  return data;
}

// Supabase RPC function (add to migration):
/*
CREATE OR REPLACE FUNCTION match_jobs(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (job_id uuid, cosine_score float)
LANGUAGE sql STABLE AS $$
  SELECT id as job_id,
         1 - (embedding <=> query_embedding) as cosine_score
  FROM jobs
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
    AND is_active = true
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
*/

// Step 2: Detailed breakdown scoring (rule-based, no LLM)
export function computeDetailedScore(
  resume: ParsedResume,
  jd: ParsedJD,
  cosineScore: number
): MatchResult {

  // Skills match
  const candidateSkills = new Set([
    ...resume.skills.technical.map(s => s.toLowerCase()),
    ...resume.skills.tools.map(s => s.toLowerCase()),
    ...resume.skills.languages.map(s => s.toLowerCase()),
  ]);
  const mustHaveSkills = jd.requirements.must_have.map(s => s.toLowerCase());
  const matchingSkills = mustHaveSkills.filter(s => candidateSkills.has(s));
  const missingSkills = mustHaveSkills.filter(s => !candidateSkills.has(s));
  const skillsMatch = (matchingSkills.length / Math.max(mustHaveSkills.length, 1)) * 100;

  // Experience match
  const candidateYears = resume.total_experience_months / 12;
  const requiredMin = jd.experience_years_min;
  const requiredMax = jd.experience_years_max;
  let experienceMatch = 100;
  if (candidateYears < requiredMin) {
    experienceMatch = Math.max(0, (candidateYears / requiredMin) * 100);
  } else if (candidateYears > requiredMax + 5) {
    experienceMatch = 80; // overqualified penalty
  }

  // Location match
  const locationMatch = resume.personal.location?.toLowerCase().includes(
    jd.location.toLowerCase()
  ) ? 100 : jd.work_type === 'remote' ? 100 : 50;

  // Salary match (if data available)
  const salaryMatch = 100; // TODO: integrate with candidate preferences

  // Domain match
  const domainMatch = resume.primary_domain.toLowerCase() === jd.domain.toLowerCase() ? 100 : 60;

  // Weighted overall score
  const overall = Math.round(
    skillsMatch * 0.40 +
    experienceMatch * 0.25 +
    locationMatch * 0.15 +
    domainMatch * 0.15 +
    salaryMatch * 0.05
  );

  return {
    job_id: jd.id,
    overall_score: overall,
    breakdown: {
      skills_match: Math.round(skillsMatch),
      experience_match: Math.round(experienceMatch),
      location_match: Math.round(locationMatch),
      salary_match: Math.round(salaryMatch),
      domain_match: Math.round(domainMatch),
    },
    missing_skills: missingSkills,
    matching_skills: matchingSkills,
  };
}
```

---

## Score Interpretation

| Score | Label | Colour in UI | Meaning |
|---|---|---|---|
| 85-100 | Excellent Match | Green | Apply immediately |
| 70-84 | Good Match | Blue | Strong candidate |
| 55-69 | Fair Match | Amber | Possible with gaps |
| 40-54 | Weak Match | Orange | Significant gaps |
| 0-39 | Poor Match | Red | Not shown in queue |

Filter: only show jobs with overall_score >= 55 in approval queue.

---

## Keeping Embeddings Fresh

Re-embed when:
- Candidate updates their resume → re-embed resume immediately
- Candidate changes preferences → re-run match (embeddings stay same)
- New jobs added → embedded by n8n job-fetcher workflow on ingest
- Job changes (salary, requirements) → re-embed that job only

Never re-embed everything on a schedule — too expensive. Only re-embed on change.

---

## Cost Tracking

```
text-embedding-3-small: $0.00002 / 1K tokens
Average resume text: ~500 tokens → $0.00001 per embed
Average JD text: ~400 tokens → $0.000008 per embed

1,000 candidates onboard: $0.01 in embedding costs
10,000 jobs embedded: $0.08 in embedding costs
ANN search: FREE (pgvector runs in your Supabase DB)

At MVP scale (1,000 users, 10,000 jobs): < $1/month in embedding cost.
```

---

## Testing Match Quality

```bash
# Run match quality tests
npm run test:matching

# Manual test: check top 10 matches for a sample resume
npx ts-node scripts/test-match.ts --resume-id <uuid>
```

Quality check: show top 10 matches to a real person who knows their resume.
Ask: "Does this look right? Would you apply to these?"
Target: 80%+ agreement rate before shipping.
