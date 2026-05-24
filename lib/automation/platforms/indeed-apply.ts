import { chromium } from 'playwright-core'
import type { ApplyToJobParams } from './playwright-apply'

/**
 * Indeed auto-apply bot.
 * Handles Indeed's application flow:
 * 1. Navigate to job page
 * 2. Click "Apply now" button
 * 3. Indeed may redirect to company site OR show its own form
 * 4. Fill contact info, resume upload, screening questions
 * 5. Submit application
 *
 * COMPLIANCE: Only runs for explicitly approved applications.
 * NOTE: Indeed often redirects to external company sites — falls back to generic driver.
 */
export async function applyToIndeed({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
  jobData,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser for Indeed job: ${jobUrl}`)

  const browserWsEndpoint = process.env.BROWSER_WS_ENDPOINT
  if (!browserWsEndpoint) throw new Error('BROWSER_WS_ENDPOINT required for Indeed automation')

  const browser = await chromium.connect(browserWsEndpoint)
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await log(`Navigated to: ${await page.title()}`)

    // Click Apply Now button
    const applyBtn = page.locator('#indeedApplyButton, button:has-text("Apply now"), a:has-text("Apply now"), button[id*="apply"], .jobsearch-IndeedApplyButton-newDesign')
    if (await applyBtn.count() === 0) {
      // Indeed might show "Apply on company site" — redirect to generic
      const externalBtn = page.locator('button:has-text("Apply on company site"), a:has-text("Apply on company site")')
      if (await externalBtn.count() > 0) {
        await log('Indeed redirects to company site. Falling back to generic driver.')
        const { applyToJob } = await import('./playwright-apply')
        await browser.close()
        await applyToJob({ jobUrl, resume, resumeFile, resumeFileName, log, generatedCoverLetter, jobData })
        return
      }
      throw new Error('No Apply button found on Indeed page')
    }

    await applyBtn.first().click()
    await log('Clicked Apply Now button')
    await page.waitForTimeout(3000)

    // Check if we were redirected to an external site
    const currentUrl = page.url()
    if (!currentUrl.includes('indeed.com')) {
      await log(`Redirected to external site: ${currentUrl}. Using generic driver.`)
      const { applyToJob } = await import('./playwright-apply')
      await browser.close()
      await applyToJob({ jobUrl: currentUrl, resume, resumeFile, resumeFileName, log, generatedCoverLetter, jobData })
      return
    }

    // Process Indeed's multi-step application form
    let stepCount = 0
    const maxSteps = 10

    while (stepCount < maxSteps) {
      stepCount++
      await log(`Processing Indeed step ${stepCount}...`)

      // Upload resume if prompted
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        await fileInput.first().setInputFiles({
          name: resumeFileName,
          mimeType: 'application/pdf',
          buffer: resumeFile,
        })
        await log('Uploaded resume')
        await page.waitForTimeout(2000)
      }

      // Fill text inputs
      const textInputs = page.locator('.ia-BasePage input[type="text"], .ia-BasePage input[type="email"], .ia-BasePage input[type="tel"], .ia-BasePage input[type="number"]')
      const inputCount = await textInputs.count()
      for (let i = 0; i < inputCount; i++) {
        const input = textInputs.nth(i)
        const currentValue = await input.inputValue()
        if (currentValue) continue

        const label = await getIndeedFieldLabel(input, page)
        const value = inferIndeedFieldValue(label, resume)
        if (value) {
          await input.fill(value)
          await log(`Filled "${label}" → "${value.slice(0, 30)}"`)
        }
      }

      // Fill textareas
      const textareas = page.locator('.ia-BasePage textarea')
      const taCount = await textareas.count()
      for (let i = 0; i < taCount; i++) {
        const ta = textareas.nth(i)
        const currentValue = await ta.inputValue()
        if (currentValue) continue
        if (generatedCoverLetter) {
          await ta.fill(generatedCoverLetter)
          await log('Filled textarea with cover letter')
        }
      }

      // Handle radio buttons — select first option as safe default
      const radioGroups = page.locator('.ia-BasePage fieldset')
      const radioCount = await radioGroups.count()
      for (let i = 0; i < radioCount; i++) {
        const group = radioGroups.nth(i)
        const firstRadio = group.locator('input[type="radio"]').first()
        if (await firstRadio.count() > 0 && !(await firstRadio.isChecked())) {
          await firstRadio.check()
        }
      }

      // Handle select dropdowns
      const selects = page.locator('.ia-BasePage select')
      const selectCount = await selects.count()
      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i)
        const currentVal = await select.inputValue()
        if (currentVal) continue
        const options = await select.locator('option').allTextContents()
        if (options.length > 1) {
          await select.selectOption({ index: 1 })
        }
      }

      // Check for Submit button
      const submitBtn = page.locator('button:has-text("Submit your application"), button:has-text("Submit"), button[data-testid="submit-button"]')
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click()
        await log('Clicked Submit application')
        await page.waitForTimeout(4000)
        break
      }

      // Click Continue button to advance
      const continueBtn = page.locator('button:has-text("Continue"), button[data-testid="continue-button"], button:has-text("Next")')
      if (await continueBtn.count() > 0) {
        await continueBtn.first().click()
        await log('Clicked Continue')
        await page.waitForTimeout(2000)
      } else {
        await log('No Continue or Submit button found, ending step loop')
        break
      }
    }

    // Verify success
    const successIndicator = page.locator('text=/application.*submitted|sent|thank you|successfully applied/i')
    if (await successIndicator.count() > 0) {
      await log('Application submitted successfully (success message detected)')
    } else {
      await log('Application flow completed (no explicit success message)')
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await log(`ERROR: Indeed automation failed: ${msg}`)
    throw new Error(`Indeed automation failed: ${msg}`)
  } finally {
    await browser.close()
    await log('Browser closed')
  }
}

/** Extract label for an Indeed form field */
async function getIndeedFieldLabel(input: import('playwright-core').Locator, page: import('playwright-core').Page): Promise<string> {
  const ariaLabel = await input.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel.toLowerCase()

  const id = await input.getAttribute('id')
  if (id) {
    const label = page.locator(`label[for="${id}"]`)
    if (await label.count() > 0) {
      return (await label.first().textContent() ?? '').toLowerCase()
    }
  }

  const placeholder = await input.getAttribute('placeholder')
  if (placeholder) return placeholder.toLowerCase()

  return ''
}

/** Map Indeed field labels to candidate resume data */
function inferIndeedFieldValue(label: string, resume: import('@/lib/types').ParsedResume): string | null {
  const l = label.toLowerCase()

  if (l.includes('first name')) return resume.name?.split(' ')[0] ?? null
  if (l.includes('last name')) return resume.name?.split(' ').slice(1).join(' ') ?? null
  if (l.includes('name')) return resume.name ?? null
  if (l.includes('email')) return resume.email ?? null
  if (l.includes('phone') || l.includes('mobile')) return resume.phone ?? null
  if (l.includes('city') || l.includes('location') || l.includes('address')) return resume.location ?? null
  if (l.includes('year') && l.includes('experience')) {
    return String(Math.max(resume.experience?.length ?? 1, 1))
  }

  return null
}
