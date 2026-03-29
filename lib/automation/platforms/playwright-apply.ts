import { chromium, Page, Locator } from 'playwright'
import { ParsedResume } from '@/lib/types'

interface ApplyToJobParams {
  jobUrl: string
  resume: ParsedResume
  resumeFile: Buffer
  resumeFileName: string
  log: (message: string) => Promise<void>
}

/**
 * Navigates to a job application page and attempts to fill out the form,
 * upload the resume, and answer basic custom questions.
 */
export async function applyToJob({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser to apply for job at: ${jobUrl}`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await log(`Successfully navigated to page: ${await page.title()}`)

    // --- Field Filling Logic ---
    if (resume.name) await fillField(page, log, ['full name', 'name'], resume.name)
    if (resume.email) await fillField(page, log, ['email', 'email address'], resume.email)
    if (resume.phone) await fillField(page, log, ['phone', 'phone number'], resume.phone)
    if (resume.location) await fillField(page, log, ['location', 'city'], resume.location)

    // --- Custom Questions (Text Areas) ---
    if (resume.summary) {
      await fillTextArea(page, log, ['cover letter', 'additional information', 'summary'], resume.summary)
    }

    // --- File Upload Logic ---
    await log('Searching for resume file input.')
    const fileInput = await findFileInput(page)
    if (fileInput) {
      await fileInput.setInputFiles({
        name: resumeFileName,
        mimeType: 'application/pdf',
        buffer: resumeFile,
      })
      await log(`Successfully attached resume: ${resumeFileName}`)
    } else {
      await log('WARNING: Could not find a resume file input on the page.')
    }

    // TODO: Add logic for dropdowns/selects (pronouns, etc.)
    // TODO: Add logic to find and click the final "Submit" button.

    await log('Finished attempting to fill form fields.')
    await page.screenshot({ path: `apply-screenshot-${Date.now()}.png`, fullPage: true })
    await log('Took a screenshot of the final page state.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    await log(`ERROR: ${errorMessage}`)
    await page.screenshot({ path: `apply-error-${Date.now()}.png` })
    throw new Error(`Playwright automation failed: ${errorMessage}`)
  } finally {
    await browser.close()
    await log('Browser closed.')
  }
}

async function fillField(page: Page, log: Function, labels: string[], value: string) {
  for (const label of labels) {
    const locator = await findLocator(page, labels)
    if (locator) {
      await locator.fill(value)
      await log(`Filled field (label: "${label}") with value: ${value}`)
      return
    }
  }
}

async function fillTextArea(page: Page, log: Function, labels: string[], value: string) {
  for (const label of labels) {
    const locator = await findLocator(page, labels, 'textarea')
    if (locator) {
      await locator.fill(value)
      await log(`Filled textarea (label: "${label}")`)
      return
    }
  }
}

async function findLocator(page: Page, labels: string[], elementType = 'input'): Promise<Locator | null> {
  for (const label of labels) {
    try {
      const byLabel = page.getByLabel(label, { exact: false })
      if (await byLabel.count() > 0 && (await byLabel.first().locator(elementType).count()) > 0) {
        return byLabel.first().locator(elementType)
      }

      const byPlaceholder = page.getByPlaceholder(label, { exact: false })
      if (await byPlaceholder.count() > 0 && (await byPlaceholder.first().locator(elementType).count()) > 0) {
        return byPlaceholder.first()
      }
    } catch {}
  }
  return null
}

async function findFileInput(page: Page): Promise<Locator | null> {
  const commonLabels = ['resume', 'cv', 'upload resume', 'attach resume']
  for (const label of commonLabels) {
    const locator = page.getByLabel(label, { exact: false })
    if (await locator.count() > 0) return locator.first()
  }
  // Fallback to a generic type selector
  const genericLocator = page.locator('input[type="file"]')
  if (await genericLocator.count() > 0) return genericLocator.first()

  return null
}
