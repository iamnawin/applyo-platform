# Testing Guide — Applyo Backend Pipeline

## Prerequisites

1. **FreeLLMAPI** running on `http://localhost:3001`
   ```bash
   git clone https://github.com/iamnawin/freellmapi
   cd freellmapi
   npm install
   npm start
   ```

2. **Environment variables** set in `.env.local`:
   ```
   AI_PROVIDER=freellmapi
   AI_BASE_URL=http://localhost:3001/v1
   AI_API_KEY=freellmapi-your-unified-key
   AI_DEFAULT_MODEL=auto
   SERPER_API_KEY=your-serper-key
   ```

3. **Supabase** running with migrations applied and `resumes` storage bucket created.

4. **Applyo dev server** running:
   ```bash
   npm run dev
   ```

---

## Test 1: FreeLLMAPI Health Check

Verify FreeLLMAPI is responding:

```bash
curl http://localhost:3001/v1/models
```

Expected: JSON list of available models.

```bash
curl http://localhost:3001/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer freellmapi-your-unified-key" ^
  -d "{\"model\": \"auto\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hello\"}]}"
```

Expected: A chat completion response with `choices[0].message.content`.

---

## Test 2: Resume Upload (Step 1)

Upload a PDF resume. This auto-creates the candidate record.

```bash
curl -X POST http://localhost:3000/api/resumes/step-1-upload ^
  -H "Cookie: <your-auth-cookie>" ^
  -F "file=@path/to/resume.pdf"
```

Expected response:
```json
{
  "resumeId": "uuid-here",
  "fileName": "resume.pdf",
  "fileUrl": "https://...",
  "candidateId": "uuid-here"
}
```

**What to verify:**
- `resumes` table has a new row with `processing_status = 'uploaded'`
- `candidates` table has a row for this user (auto-created if first time)

---

## Test 3: Resume Parse (Step 2)

Parse the uploaded resume using FreeLLMAPI:

```bash
curl -X POST http://localhost:3000/api/resumes/step-2-parse ^
  -H "Content-Type: application/json" ^
  -H "Cookie: <your-auth-cookie>" ^
  -d "{\"resumeId\": \"<resume-id-from-step-1>\"}"
```

Expected response:
```json
{
  "parsed": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "skills": ["..."],
    "experience": [...],
    "education": [...]
  }
}
```

**What to verify:**
- Resume row updated with `parsed_data` JSON
- `processing_status` updated to `'parsed'`

---

## Test 4: Resume Save (Step 3)

Save parsed data and generate embedding:

```bash
curl -X POST http://localhost:3000/api/resumes/step-3-save ^
  -H "Content-Type: application/json" ^
  -H "Cookie: <your-auth-cookie>" ^
  -d "{\"resumeId\": \"<resume-id>\"}"
```

Expected response:
```json
{
  "success": true,
  "resumeId": "..."
}
```

**What to verify:**
- `processing_status` = `'ready'`
- `embedding` column populated (768-dimension vector) — check with:
  ```sql
  SELECT id, array_length(embedding::real[], 1) FROM resumes WHERE id = '<resume-id>';
  ```

---

## Test 5: Job Discovery

Trigger job discovery based on candidate preferences:

```bash
curl -X POST http://localhost:3000/api/jobs/discover ^
  -H "Content-Type: application/json" ^
  -H "Cookie: <your-auth-cookie>" ^
  -d "{}"
```

Expected response:
```json
{
  "discovered": 5,
  "matched": 3
}
```

**What to verify:**
- New rows in `jobs` table
- New rows in `applications` table with `status = 'pending'` and `score >= 50`
- Check Serper was called (FreeLLMAPI logs will show normalization calls)

---

## Test 6: Approval Queue

Fetch pending applications:

```bash
curl http://localhost:3000/api/approvals ^
  -H "Cookie: <your-auth-cookie>"
```

Expected: Array of applications with `status: 'pending'` and joined job data.

---

## Test 7: Approve an Application

```bash
curl -X POST http://localhost:3000/api/approvals ^
  -H "Content-Type: application/json" ^
  -H "Cookie: <your-auth-cookie>" ^
  -d "{\"applicationId\": \"<app-id>\", \"action\": \"approved\"}"
```

Expected response:
```json
{
  "success": true,
  "automationStatus": "manual"
}
```

**What to verify:**
- Application `status` updated to `'approved'`
- `automation_status` = `'manual'` (since no BROWSER_WS_ENDPOINT is set)
- If `BROWSER_WS_ENDPOINT` is configured, it would attempt auto-apply

---

## Test 8: AI Chat Endpoint

```bash
curl -X POST http://localhost:3000/api/ai/chat ^
  -H "Content-Type: application/json" ^
  -H "Cookie: <your-auth-cookie>" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Write a cover letter for a React developer role at Google\"}], \"mode\": \"draft\"}"
```

Expected: JSON with `response` field containing the AI-generated text.

---

## Test 9: Full Pipeline (Browser UI)

1. Open `http://localhost:3000` → Sign up / Log in
2. Go to Dashboard → **Upload Resume** tab → upload a PDF
3. Wait for parse to complete (status shows "Ready")
4. Go to **Preferences** tab → set role, location, salary, work type
5. *(When Discover button is added)* Click "Discover Jobs" or call the API manually
6. Go to **Approval Queue** → see matched jobs with scores
7. Approve a job → check Applications tab shows it as "Manual" or "Applied"

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| FreeLLMAPI returns 500 | Check FreeLLMAPI logs; ensure at least one provider key is configured in FreeLLMAPI |
| Step 2 parse returns empty | Verify PDF is readable text (not scanned image); check FreeLLMAPI model supports long context |
| Job discovery returns 0 | Verify `SERPER_API_KEY` is valid; check candidate has preferences saved |
| Embedding fails | Verify `GOOGLE_AI_API_KEY` is set (Gemini handles embeddings, not FreeLLMAPI) |
| Auth cookie missing | Log in via browser first, copy cookie from DevTools → Network tab |

---

## Quick Smoke Test (PowerShell)

Run all tests sequentially after logging in via browser:

```powershell
# Set your auth cookie (grab from browser DevTools)
$cookie = "sb-access-token=...; sb-refresh-token=..."
$base = "http://localhost:3000"

# Test FreeLLMAPI
Invoke-RestMethod "http://localhost:3001/v1/models"

# Test AI Chat
Invoke-RestMethod -Method POST "$base/api/ai/chat" `
  -Headers @{ "Cookie" = $cookie; "Content-Type" = "application/json" } `
  -Body '{"messages":[{"role":"user","content":"Hello"}],"mode":"chat"}'

# Test Job Discovery
Invoke-RestMethod -Method POST "$base/api/jobs/discover" `
  -Headers @{ "Cookie" = $cookie; "Content-Type" = "application/json" } `
  -Body '{}'

# Test Approval Queue
Invoke-RestMethod "$base/api/approvals" `
  -Headers @{ "Cookie" = $cookie }
```
