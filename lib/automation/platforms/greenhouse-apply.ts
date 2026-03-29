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
 * Navigates to a Greenhouse job application page and attempts to fill out the form,
 * upload the resume, and answer basic custom questions.
 */
export async function applyToGreenhouse({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser to apply for Greenhouse job at: ${jobUrl}`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await log(`Successfully navigated to page: ${await page.title()}`)

    // --- Field Filling Logic ---
    // Greenhouse often has a "My Information" section
    await log('Attempting to fill basic information fields.')
    if (resume.name) await fillField(page, log, ['first name', 'given name'], resume.name.split(' ')[0])
    if (resume.name) await fillField(page, log, ['last name', 'surname'], resume.name.split(' ').slice(1).join(' '))
    if (resume.email) await fillField(page, log, ['email', 'email address'], resume.email)
    if (resume.phone) await fillField(page, log, ['phone', 'phone number'], resume.phone)
    if (resume.location) await fillField(page, log, ['location', 'city'], resume.location)

    // --- Resume Upload Logic ---
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
      await log('WARNING: Could not find a resume file input on the Greenhouse page.')
    }

    // TODO: Handle "Apply with LinkedIn" button if present
    // TODO: Handle custom questions (text, dropdowns, radio buttons)
    // TODO: Find and click the final "Submit Application" button. This is crucial.

    await log('Finished attempting to fill Greenhouse form fields.')
    await page.screenshot({ path: `greenhouse-apply-screenshot-${Date.now()}.png`, fullPage: true })
    await log('Took a screenshot of the final page state.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    await log(`ERROR: ${errorMessage}`)
    await page.screenshot({ path: `greenhouse-apply-error-${Date.now()}.png` })
    throw new Error(`Greenhouse automation failed: ${errorMessage}`)
  } finally {
    await browser.close()
    await log('Browser closed.')
  }
}

async function fillField(page: Page, log: Function, labels: string[], value: string) {
  for (const label of labels) {
    // Try byLabel first, then byPlaceholder
    let locator = page.getByLabel(label, { exact: false })
    if (await locator.count() === 0) {
      locator = page.getByPlaceholder(label, { exact: false })
    }

    if (await locator.count() > 0) {
      await locator.first().fill(value)
      await log(`Filled field (label/placeholder: "${label}") with value: ${value}`)
      return
    }
  }
}

async function findFileInput(page: Page): Promise<Locator | null> {
  const commonLabels = ['resume', 'cv', 'upload resume', 'attach resume', 'upload your resume']
  for (const label of commonLabels) {
    const locator = page.getByLabel(label, { exact: false })
    if (await locator.count() > 0) return locator.first()
  }
  // Fallback to a generic type selector
  const genericLocator = page.locator('input[type="file"]')
  if (await genericLocator.count() > 0) return genericLocator.first()

  return null
}
