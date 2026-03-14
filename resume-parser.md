# SKILL: Resume Parser
# File: .claude/skills/resume-parser.md
# Use this before working on: src/lib/ai/parse-resume.ts, src/lib/ai/prompts/resume.prompt.ts

---

## What This Module Does

Converts a raw resume PDF/DOCX into a structured JSON object that the rest
of the Aplio system can work with. This JSON is the foundation of everything —
matching, scoring, embedding, gap analysis.

Pipeline:
```
PDF/DOCX file
  → Extract raw text (pdf-parse / mammoth)
  → Send to GPT-4o-mini with structured prompt
  → Validate output against Zod schema
  → Store as candidate.profile_json in Supabase
  → Trigger embedding pipeline (see ai-matching.md)
```

---

## The Output Schema (Source of Truth)

Every parsed resume MUST conform to this schema.
Located at: `src/types/candidate.ts`

```typescript
export const ResumeSchema = z.object({
  personal: z.object({
    full_name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    portfolio_url: z.string().url().optional(),
  }),

  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    start_date: z.string(),           // "YYYY-MM" format
    end_date: z.string().optional(),  // null = current job
    is_current: z.boolean(),
    responsibilities: z.array(z.string()),
    tech_used: z.array(z.string()),
    industry: z.string().optional(),
  })),

  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    start_year: z.number(),
    end_year: z.number().optional(),
    grade: z.string().optional(),     // CGPA, percentage, grade
  })),

  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    tools: z.array(z.string()),
    languages: z.array(z.string()),   // programming languages
    spoken_languages: z.array(z.string()),
  }),

  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string().optional(),
    credential_id: z.string().optional(),
  })),

  summary: z.string().optional(),

  // Computed by the parser, not extracted
  career_gaps: z.array(z.object({
    from: z.string(),
    to: z.string(),
    duration_months: z.number(),
  })),

  total_experience_months: z.number(),
  seniority_level: z.enum(["fresher", "junior", "mid", "senior", "lead", "executive"]),
  primary_domain: z.string(),          // e.g. "Software Engineering", "Marketing"
  resume_quality_score: z.number().min(0).max(100),
  quality_tips: z.array(z.string()),
});

export type ParsedResume = z.infer<typeof ResumeSchema>;
```

---

## The System Prompt

Located at: `src/lib/ai/prompts/resume.prompt.ts`

**Rules for editing this prompt:**
1. ALWAYS ask for JSON only — no markdown, no preamble
2. ALWAYS include the full schema in the prompt
3. ALWAYS instruct the model to compute career_gaps from dates
4. NEVER ask for salary expectations — this is not our data to collect
5. Test on 10 real resumes before committing any prompt change

```typescript
export const RESUME_PARSE_SYSTEM_PROMPT = `
You are an expert resume parser for the Indian job market.

Extract all information from the resume and return ONLY a valid JSON object.
No markdown. No explanation. No code fences. Just raw JSON.

Rules:
- Dates must be in "YYYY-MM" format. If only year is given, use "YYYY-01".
- If current job, set end_date to null and is_current to true.
- Compute career_gaps: find gaps > 1 month between jobs. Include gap from education end to first job.
- Compute total_experience_months from all work experience combined.
- Seniority: fresher (0yr), junior (0-2yr), mid (2-5yr), senior (5-10yr), lead (8+yr with team mgmt), executive (C-suite/VP).
- resume_quality_score: 0-100. Penalize for: no summary (-10), no LinkedIn (-5), vague responsibilities (-15), gaps > 6mo (-10), missing dates (-10). Reward for: quantified achievements (+20), strong technical skills (+10), certifications (+10).
- quality_tips: list 3-5 specific improvements the candidate should make.
- If a field is not present in the resume, omit it (do not use null for optional fields).

Return JSON conforming exactly to this schema:
[INSERT SCHEMA HERE AT RUNTIME]
`;
```

---

## The Parse Function

Located at: `src/lib/ai/parse-resume.ts`

```typescript
import { openai } from '@/lib/utils/openai';
import { supabaseServer } from '@/lib/utils/supabase';
import { ResumeSchema, ParsedResume } from '@/types/candidate';
import { RESUME_PARSE_SYSTEM_PROMPT } from './prompts/resume.prompt';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResume(
  fileBuffer: Buffer,
  mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
): Promise<{ data: ParsedResume | null; error: string | null }> {
  try {
    // Step 1: Extract raw text
    let rawText = '';
    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(fileBuffer);
      rawText = pdfData.text;
    } else {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = result.value;
    }

    if (!rawText || rawText.trim().length < 100) {
      return { data: null, error: 'Resume appears to be empty or unreadable.' };
    }

    // Step 2: Call GPT-4o-mini
    const systemPrompt = RESUME_PARSE_SYSTEM_PROMPT.replace(
      '[INSERT SCHEMA HERE AT RUNTIME]',
      JSON.stringify(ResumeSchema.shape, null, 2)
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this resume:\n\n${rawText}` },
      ],
      temperature: 0.1,   // Low temp for structured extraction
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const rawJson = response.choices[0].message.content;
    if (!rawJson) return { data: null, error: 'AI returned empty response.' };

    // Step 3: Validate against schema
    const parsed = ResumeSchema.safeParse(JSON.parse(rawJson));
    if (!parsed.success) {
      console.error('Schema validation failed:', parsed.error);
      return { data: null, error: 'Parsed resume did not match expected schema.' };
    }

    return { data: parsed.data, error: null };

  } catch (err) {
    console.error('parseResume error:', err);
    return { data: null, error: 'Failed to parse resume. Please try again.' };
  }
}
```

---

## Common Failures & Fixes

| Problem | Cause | Fix |
|---|---|---|
| Career gaps not detected | Overlapping date ranges | Add validation step to check for overlaps before gap calculation |
| Skills list too generic | Vague resume language | Prompt: "Extract specific tool names, not categories. Write 'React.js' not 'frontend frameworks'" |
| Telugu/Hindi resume fails | Non-Latin characters confuse parser | Pre-process: detect language, add language hint to prompt |
| Quality score always 100 | Model is too generous | Add few-shot examples of low-quality resumes in prompt |
| JSON parse fails | Model adds markdown fences | Strip ```json and ``` before parsing. Always use `response_format: json_object` |
| Date format wrong | Model uses "Jan 2022" etc | Strict prompt: "ALL dates in YYYY-MM format. No other format accepted." |

---

## Testing

Run parse tests:
```bash
npm run test:parse
```

Test against sample resumes in `__tests__/fixtures/resumes/`:
- `fresher_btech.pdf` — 0 experience, no gaps
- `senior_dev_5yr.pdf` — career gap 2021, multiple stacks
- `non_english.pdf` — Telugu content mixed in
- `bad_format.pdf` — tables, columns, unusual layout

Expected: 90%+ fields correctly extracted on all fixtures.

---

## Performance Notes

- Average parse time: 4-8 seconds (GPT-4o-mini)
- Cost per parse: ~$0.002 (3000 tokens in + 3000 tokens out)
- Cache strategy: store parsed_json in DB — never re-parse same file hash
- File hash check before parse: `sha256(fileBuffer)` → check `resumes.file_hash` column
