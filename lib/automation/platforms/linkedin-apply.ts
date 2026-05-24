import { chromium } from 'playwright-core'
import type { ApplyToJobParams } from './playwright-apply'

/**
 * LinkedIn Easy Apply bot.
 * Handles LinkedIn's multi-step Easy Apply flow:
 * 1. Navigate to job page
 * 2. Click "Easy Apply" button
 * 3. Fill contact info, resume upload, additional questions
 * 4. Navigate through multi-step modal
 * 5. Submit application
 *
 * COMPLIANCE: Only runs for explicitly approved applications.
 * NOTE: Requires BROWSER_WS_ENDPOINT and LinkedIn session cookies or login.
 */
export async function applyToLinkedIn({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser for LinkedIn job: ${jobUrl}`)

  const browserWsEndpoint = process.env.BROWSER_WS_ENDPOINT
  if (!browserWsEndpoint) throw new Error('BROWSER_WS_ENDPOINT required for LinkedIn automation')

  const browser = await chromium.connect(browserWsEndpoint)
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await log(`Navigated to: ${await page.title()}`)

    // Check if we're on a login wall
    if (page.url().includes('/login') || page.url().includes('/authwall')) {
      await log('WARNING: LinkedIn login wall detected. Cannot proceed without auth session.')
      throw new Error('LinkedIn requires authentication. Configure session cookies in BROWSER_WS_ENDPOINT.')
    }

    // Click Easy Apply button
    const easyApplyBtn = page.locator('button.jobs-apply-button, button:has-text("Easy Apply"), button[aria-label*="Easy Apply"]')
    if (await easyApplyBtn.count() === 0) {
      await log('No Easy Apply button found. Job may require external application.')
      throw new Error('No Easy Apply button found — job requires external application.')
    }
    await easyApplyBtn.first().click()
    await log('Clicked Easy Apply button')
    await page.waitForTimeout(2000)

    // Wait for the modal to appear
    const modal = page.locator('.jobs-easy-apply-modal, [role="dialog"]')
    await modal.waitFor({ timeout: 10000 })
    await log('Easy Apply modal opened')

    // Process multi-step form
    let stepCount = 0
    const maxSteps = 8

    while (stepCount < maxSteps) {
      stepCount++
      await log(`Processing step ${stepCount}...`)

      // Upload resume if file input is visible
      const fileInput = modal.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        await fileInput.first().setInputFiles({
          name: resumeFileName,
          mimeType: 'application/pdf',
          buffer: resumeFile,
        })
        await log('Uploaded resume')
        await page.waitForTimeout(2000)
      }

      // Fill text inputs based on labels
      const textInputs = modal.locator('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]')
      const inputCount = await textInputs.count()
      for (let i = 0; i < inputCount; i++) {
        const input = textInputs.nth(i)
        const currentValue = await input.inputValue()
        if (currentValue) continue // Skip pre-filled fields

        const label = await getFieldLabel(input, modal)
        const value = inferLinkedInFieldValue(label, resume)
        if (value) {
          await input.fill(value)
          await log(`Filled "${label}" with "${value.slice(0, 30)}..."`)
        }
      }

      // Fill textareas (cover letter, additional info)
      const textareas = modal.locator('textarea')
      const taCount = await textareas.count()
      for (let i = 0; i < taCount; i++) {
        const ta = textareas.nth(i)
        const currentValue = await ta.inputValue()
        if (currentValue) continue
        if (generatedCoverLetter) {
          await ta.fill(generatedCoverLetter)
          await log('Filled cover letter / additional info textarea')
        }
      }

      // Handle select dropdowns
      const selects = modal.locator('select')
      const selectCount = await selects.count()
      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i)
        const options = await select.locator('option').allTextContents()
        if (options.length > 1) {
          // Select first non-empty option as a safe default
          await select.selectOption({ index: 1 })
          await log(`Selected first option in dropdown: "${options[1]?.trim()}"`)
        }
      }

      // Check for Submit button (final step)
      const submitBtn = modal.locator('button[aria-label*="Submit"], button:has-text("Submit application")')
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click()
        await log('Clicked Submit application')
        await page.waitForTimeout(3000)
        break
      }

      // Click Next/Review button to advance
      const nextBtn = modal.locator('button[aria-label*="Continue"], button[aria-label*="Next"], button[aria-label*="Review"], button:has-text("Next"), button:has-text("Review")')
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click()
        await log('Clicked Next/Review')
        await page.waitForTimeout(2000)
      } else {
        await log('No Next or Submit button found, ending step loop')
        break
      }
    }

    // Verify success
    const successIndicator = page.locator('text=/application.*sent|submitted|thank you/i, [data-test-modal-close-btn]')
    if (await successIndicator.count() > 0) {
      await log('Application submitted successfully (success indicator detected)')
    } else {
      await log('Application flow completed (no explicit success message)')
    }

    // Dismiss any post-apply modal
    const dismissBtn = page.locator('button[aria-label="Dismiss"], button:has-text("Done")')
    if (await dismissBtn.count() > 0) {
      await dismissBtn.first().click()
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await log(`ERROR: LinkedIn automation failed: ${msg}`)
    throw new Error(`LinkedIn automation failed: ${msg}`)
  } finally {
    await browser.close()
    await log('Browser closed')
  }
}

/** Extract the label text for a form field from nearby elements */
async function getFieldLabel(input: import('playwright-core').Locator, modal: import('playwright-core').Locator): Promise<string> {
  // Try aria-label first
  const ariaLabel = await input.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel.toLowerCase()

  // Try associated label via id
  const id = await input.getAttribute('id')
  if (id) {
    const label = modal.locator(`label[for="${id}"]`)
    if (await label.count() > 0) {
      return (await label.first().textContent() ?? '').toLowerCase()
    }
  }

  // Try placeholder
  const placeholder = await input.getAttribute('placeholder')
  if (placeholder) return placeholder.toLowerCase()

  return ''
}

/** Map LinkedIn field labels to candidate resume data */
function inferLinkedInFieldValue(label: string, resume: import('@/lib/types').ParsedResume): string | null {
  const l = label.toLowerCase()

  if (l.includes('first name')) return resume.name?.split(' ')[0] ?? null
  if (l.includes('last name')) return resume.name?.split(' ').slice(1).join(' ') ?? null
  if (l.includes('full name') || l.includes('name')) return resume.name ?? null
  if (l.includes('email')) return resume.email ?? null
  if (l.includes('phone') || l.includes('mobile')) return resume.phone ?? null
  if (l.includes('city') || l.includes('location')) return resume.location ?? null
  if (l.includes('year') && l.includes('experience')) {
    const years = resume.experience?.length ?? 0
    return String(Math.max(years, 1))
  }
  if (l.includes('headline') || l.includes('summary')) return resume.summary?.slice(0, 200) ?? null

  return null
}
