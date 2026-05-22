import { chromium } from 'playwright-core'
import type { ApplyToJobParams } from './playwright-apply'

/**
 * Naukri.com auto-apply bot.
 * Handles Naukri's specific application flow:
 * 1. Navigate to job page
 * 2. Click "Apply" button
 * 3. Upload resume if prompted
 * 4. Fill any additional fields
 * 5. Submit application
 *
 * COMPLIANCE: Only runs for explicitly approved applications.
 */
export async function applyToNaukri({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser for Naukri job: ${jobUrl}`)

  const browserWsEndpoint = process.env.BROWSER_WS_ENDPOINT
  if (!browserWsEndpoint) throw new Error('BROWSER_WS_ENDPOINT required for Naukri automation')

  const browser = await chromium.connect(browserWsEndpoint)
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await log(`Navigated to: ${await page.title()}`)

    // Look for the Apply button on Naukri
    const applyBtn = page.locator('button:has-text("Apply"), a:has-text("Apply on company site"), button#apply-button, .apply-button')
    if (await applyBtn.count() > 0) {
      await applyBtn.first().click()
      await log('Clicked Apply button')
      await page.waitForTimeout(3000)
    } else {
      await log('WARNING: Could not find Apply button on Naukri page')
    }

    // Check if resume upload is prompted
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: resumeFileName,
        mimeType: 'application/pdf',
        buffer: resumeFile,
      })
      await log(`Uploaded resume: ${resumeFileName}`)
      await page.waitForTimeout(2000)
    }

    // Fill common Naukri fields if visible
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]')
    if (await nameInput.count() > 0 && resume.name) {
      await nameInput.first().fill(resume.name)
      await log('Filled name field')
    }

    const emailInput = page.locator('input[name="email"], input[type="email"]')
    if (await emailInput.count() > 0 && resume.email) {
      await emailInput.first().fill(resume.email)
      await log('Filled email field')
    }

    const phoneInput = page.locator('input[name="mobile"], input[name="phone"], input[type="tel"]')
    if (await phoneInput.count() > 0 && resume.phone) {
      await phoneInput.first().fill(resume.phone)
      await log('Filled phone field')
    }

    // Fill cover letter if there's a textarea
    if (generatedCoverLetter) {
      const coverLetterArea = page.locator('textarea')
      if (await coverLetterArea.count() > 0) {
        await coverLetterArea.first().fill(generatedCoverLetter)
        await log('Filled cover letter')
      }
    }

    // Submit the application
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Apply")')
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click()
      await log('Clicked submit button')
      await page.waitForTimeout(4000)
    }

    // Check for success indicators
    const successIndicator = page.locator('text=/applied|success|thank you|congratulations/i')
    if (await successIndicator.count() > 0) {
      await log('Application submitted successfully (success message detected)')
    } else {
      await log('Application flow completed (no explicit success message detected)')
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await log(`ERROR: Naukri automation failed: ${msg}`)
    throw new Error(`Naukri automation failed: ${msg}`)
  } finally {
    await browser.close()
    await log('Browser closed')
  }
}
