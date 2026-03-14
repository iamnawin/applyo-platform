# SKILL: Playwright Auto-Apply Bot
# File: .claude/skills/playwright-apply.md
# Use this before working on: automation/, src/lib/automation/

---

## What This Module Does

The auto-apply bot is a **separate Node.js process** (not part of Next.js).
It listens to an application queue, launches a headless Chromium browser,
logs into job platforms as the candidate, and submits applications on their behalf.

This is the highest-risk, most fragile part of the entire system.
Read this file carefully before making any changes.

---

## Architecture

```
Next.js API (/api/apply)
    → writes to Supabase apply_queue table
    → signals n8n webhook

n8n workflow (apply-queue.json)
    → polls apply_queue for status = "pending"
    → POSTs to automation service: POST /apply { job_id, candidate_id }

Automation Service (automation/runner.ts)
    → receives request
    → loads candidate credentials + parsed resume from Supabase
    → selects correct platform handler (naukri / linkedin / indeed)
    → launches Playwright browser
    → executes apply flow
    → writes result back to Supabase (applications table)
    → updates apply_queue status
```

---

## Platform Support Status

| Platform | Status | Apply Method | Notes |
|---|---|---|---|
| Naukri.com | Active | Easy Apply form | Primary platform. Most reliable. |
| LinkedIn | Planned v2 | Easy Apply | Requires candidate LinkedIn credentials |
| Indeed India | Planned v2 | Apply form | Simpler flow than LinkedIn |
| Wellfound | Planned v3 | Custom form | Variable form structure — harder |
| Internshala | Planned v3 | Easy Apply | Simpler, good for freshers |

---

## Core Rules — NEVER Break These

1. **Never apply without status = "approved"** in apply_queue. Check before every apply.
2. **Never store plaintext passwords** — all credentials encrypted with AES-256 before DB storage.
3. **Always capture confirmation** — screenshot + confirmation text after successful apply.
4. **Rate limit strictly** — max 10 applications per hour per platform per account to avoid ban.
5. **Human-like delays** — add random delays between actions (800ms–2500ms). Never instant clicks.
6. **Stop on CAPTCHA** — detect CAPTCHA, update status to "captcha_required", notify candidate. Do NOT try to solve.
7. **Retry max once** — if apply fails, retry once after 5 minutes. If fails again, mark "failed".
8. **Never reveal bot to HR** — errors on HR side should never mention automation.

---

## Naukri Apply Flow

File: `automation/platforms/naukri.ts`

```typescript
import { chromium, Page } from 'playwright';
import { decrypt } from '../utils/crypto';
import { saveApplication } from '../utils/db';

export async function applyNaukri(
  jobUrl: string,
  candidateId: string,
  encryptedCredentials: { email: string; password: string }
): Promise<{ success: boolean; confirmation?: string; error?: string }> {

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // hide bot fingerprint
    ],
  });

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),    // rotate user agents
    viewport: { width: 1366, height: 768 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });

  const page = await context.newPage();

  try {
    // Step 1: Login
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'networkidle' });
    await humanDelay(1000, 2000);

    await page.fill('#usernameField', decrypt(encryptedCredentials.email));
    await humanDelay(300, 700);
    await page.fill('#passwordField', decrypt(encryptedCredentials.password));
    await humanDelay(500, 1000);
    await page.click('[data-ga-track="login-button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

    // Step 2: Check for CAPTCHA
    const captcha = await page.$('[class*="captcha"], iframe[src*="recaptcha"]');
    if (captcha) {
      return { success: false, error: 'captcha_required' };
    }

    // Step 3: Navigate to job
    await page.goto(jobUrl, { waitUntil: 'networkidle' });
    await humanDelay(1500, 2500);

    // Step 4: Click Apply
    const applyBtn = await page.$('[data-ga-track*="apply"], button:has-text("Apply")');
    if (!applyBtn) {
      return { success: false, error: 'apply_button_not_found' };
    }
    await applyBtn.click();
    await humanDelay(1000, 2000);

    // Step 5: Handle Easy Apply modal if present
    const modal = await page.$('[class*="apply-modal"], [class*="applyModal"]');
    if (modal) {
      const submitBtn = await modal.$('button[type="submit"], button:has-text("Submit")');
      if (submitBtn) {
        await submitBtn.click();
        await humanDelay(1000, 2000);
      }
    }

    // Step 6: Capture confirmation
    const confirmation = await page.textContent('[class*="success"], [class*="applied"]') || 'Applied';
    const screenshot = await page.screenshot({ type: 'png' });

    return { success: true, confirmation };

  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    await browser.close();
  }
}

// Utility: random human-like delay
async function humanDelay(min: number, max: number) {
  const ms = Math.floor(Math.random() * (max - min) + min);
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: rotate user agents
function getRandomUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}
```

---

## apply_queue Table Schema

```sql
CREATE TABLE apply_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id),
  job_id UUID REFERENCES jobs(id),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','applied','failed','captcha_required','skipped')),
  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  confirmation TEXT,
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Error Codes & What They Mean

| Error Code | Meaning | Action |
|---|---|---|
| `captcha_required` | CAPTCHA detected mid-flow | Pause queue, notify candidate via email |
| `apply_button_not_found` | Job page changed or job expired | Mark failed, remove from queue |
| `login_failed` | Wrong credentials or account locked | Notify candidate to re-enter credentials |
| `session_expired` | Platform logged out mid-flow | Re-authenticate and retry |
| `rate_limited` | Too many requests, platform throttled | Pause 2 hours, then resume |
| `timeout` | Page took too long to load | Retry once, then mark failed |
| `unknown` | Uncaught exception | Log full stack, mark failed, alert admin |

---

## Rate Limiting Config

Located at `automation/config.ts`:

```typescript
export const RATE_LIMITS = {
  naukri: {
    maxPerHour: 10,
    minDelayBetweenApplies: 4 * 60 * 1000,  // 4 minutes
    maxPerDay: 40,
    cooldownAfterCaptcha: 4 * 60 * 60 * 1000, // 4 hours
  },
  linkedin: {
    maxPerHour: 5,
    minDelayBetweenApplies: 8 * 60 * 1000,  // 8 minutes
    maxPerDay: 20,
    cooldownAfterCaptcha: 8 * 60 * 60 * 1000,
  },
};
```

---

## Testing the Bot

```bash
# Run bot in headed mode to see what it's doing visually
HEADLESS=false npx ts-node automation/runner.ts --debug

# Run against test account (never use real candidate accounts for testing)
TEST_CANDIDATE_ID=test-uuid npx ts-node automation/runner.ts

# Check apply queue in Supabase Studio
# Filter: status = 'failed' to debug errors
```

**Test accounts:** Use dedicated test accounts on Naukri (not real candidate accounts).
Test account credentials are in 1Password under "Aplio Test Accounts".

---

## Monitoring

Bot health is visible in the Admin dashboard at `/admin/bots`.
Metrics tracked:
- Applications fired in last 24h
- Success rate per platform
- CAPTCHA encounter rate
- Average apply time per platform

Alert triggers:
- Success rate drops below 70% → Slack alert
- CAPTCHA rate above 10% → Pause queue, alert
- Bot process crashes → Auto-restart via PM2, alert admin
