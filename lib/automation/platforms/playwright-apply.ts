import { chromium, Page, Locator } from 'playwright'
import { ParsedResume, NormalizedJob, Application, Job } from '@/lib/types' // Added NormalizedJob, Application, Job
import { inferFieldPurpose } from '@/lib/ai/infer-field-purpose' // Import AI utility
import { findSubmitButton } from '@/lib/ai/find-submit-button' // Import AI utility
import { selectDropdownOption } from '@/lib/ai/select-dropdown-option' // Import AI utility

interface ApplyToJobParams {
  jobUrl: string
  resume: ParsedResume
  resumeFile: Buffer
  resumeFileName: string
  log: (message: string) => Promise<void>
  generatedCoverLetter?: string
  application: Application & { job: Job } // Added application to get normalized_data
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
  generatedCoverLetter,
  application, // Destructure application
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser to apply for job at: ${jobUrl}`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await log(`Successfully navigated to page: ${await page.title()}`)

    // --- Field Filling Logic ---
    // Attempt to fill fields using AI inference for better adaptability
    await log('Attempting to fill fields using AI inference.')
    await fillFieldAI(page, log, 'name', resume.name)
    await fillFieldAI(page, log, 'email', resume.email)
    await fillFieldAI(page, log, 'phone', resume.phone)
    await fillFieldAI(page, log, 'location', resume.location)

    // --- Custom Questions (Text Areas) ---
    // Prioritize generated cover letter if available, otherwise use resume summary
    if (generatedCoverLetter) {
      await fillTextAreaAI(page, log, 'cover_letter', generatedCoverLetter)
    } else if (resume.summary) {
      await fillTextAreaAI(page, log, 'summary', resume.summary)
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

    // --- Dropdown/Select Logic ---
    await log('Attempting to fill dropdowns using AI inference.')
    const selectLocators = page.locator('select')
    const selectCount = await selectLocators.count()
    for (let i = 0; i < selectCount; i++) {
      const locator = selectLocators.nth(i)
      const boundingBox = await locator.boundingBox()
      if (!boundingBox) continue // Skip hidden elements

      const htmlSnippet = await page.evaluate(el => el.outerHTML, await locator.elementHandle())
      const selectionResult = await selectDropdownOption(htmlSnippet, resume, application.job.normalized_data) // Assuming application.job.normalized_data is available

      if (selectionResult.selected_value && selectionResult.confidence_score > 0.7) {
        await locator.selectOption(selectionResult.selected_value)
        await log(`Selected AI-inferred option "${selectionResult.selected_value}" for dropdown (confidence: ${selectionResult.confidence_score.toFixed(2)})`)
      } else {
        await log(`WARNING: Could not AI-infer option for dropdown. Reasoning: ${selectionResult.reasoning}`)
      }
    }

    // --- Submit Button Logic ---
    await log('Attempting to find and click submit button using AI inference.')
    const formHtml = await page.content() // Get entire page content or specific form content
    const submitButtonResult = await findSubmitButton(formHtml)

    if (submitButtonResult.selector && submitButtonResult.confidence_score > 0.7) {
      await page.locator(submitButtonResult.selector).click()
      await log(`Clicked AI-inferred submit button (selector: "${submitButtonResult.selector}", confidence: ${submitButtonResult.confidence_score.toFixed(2)})`)
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => log('No navigation after submit, assuming form submitted successfully.'))
    } else {
      await log(`WARNING: Could not find AI-inferred submit button. Reasoning: ${submitButtonResult.reasoning}`)
      // Fallback: Try to find common submit buttons
      const commonSubmitButtons = page.locator('button:has-text("Submit"), button:has-text("Apply"), input[type="submit"], button[type="submit"]')
      if (await commonSubmitButtons.count() > 0) {
        await commonSubmitButtons.first().click()
        await log('Clicked a common submit button as a fallback.')
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => log('No navigation after fallback submit, assuming form submitted successfully.'))
      } else {
        await log('WARNING: No submit button found, application might not be submitted.')
      }
    }

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

// New AI-driven fillField function
async function fillFieldAI(page: Page, log: Function, targetPurpose: string, value: string) {
  if (!value) return // Don't try to fill if value is empty

  const inputLocators = page.locator('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"]')

  const count = await inputLocators.count()
  for (let i = 0; i < count; i++) {
    const locator = inputLocators.nth(i)
    const boundingBox = await locator.boundingBox()
    if (!boundingBox) continue // Skip hidden elements

    const htmlSnippet = await page.evaluate(el => el.outerHTML, await locator.elementHandle())
    const inferred = await inferFieldPurpose(htmlSnippet)

    if (inferred.confidence_score > 0.7 && inferred.inferred_purpose === targetPurpose) {
      await locator.fill(value)
      await log(`Filled AI-inferred field (purpose: "${targetPurpose}", confidence: ${inferred.confidence_score.toFixed(2)}) with value: ${value}`)
      return
    }
  }
  await log(`WARNING: Could not find AI-inferred field for purpose "${targetPurpose}".`)
}

// New AI-driven fillTextArea function
async function fillTextAreaAI(page: Page, log: Function, targetPurpose: string, value: string) {
  if (!value) return // Don't try to fill if value is empty

  const textareaLocators = page.locator('textarea')

  const count = await textareaLocators.count()
  for (let i = 0; i < count; i++) {
    const locator = textareaLocators.nth(i)
    const boundingBox = await locator.boundingBox()
    if (!boundingBox) continue // Skip hidden elements

    const htmlSnippet = await page.evaluate(el => el.outerHTML, await locator.elementHandle())
    const inferred = await inferFieldPurpose(htmlSnippet)

    if (inferred.confidence_score > 0.7 && inferred.inferred_purpose === targetPurpose) {
      await locator.fill(value)
      await log(`Filled AI-inferred textarea (purpose: "${targetPurpose}", confidence: ${inferred.confidence_score.toFixed(2)})`)
      return
    }
  }
  await log(`WARNING: Could not find AI-inferred textarea for purpose "${targetPurpose}".`)
}

// Original helper functions (might be removed or refactored later)
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
