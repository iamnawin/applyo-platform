import { chromium, Page, Locator } from 'playwright-core'
import { ParsedResume } from '@/lib/types'
import { selectDropdownOption } from '@/lib/ai/select-dropdown-option'
import { selectCheckboxRadio } from '@/lib/ai/select-checkbox-radio'
import { generateApplicationContent } from '@/lib/ai/generate-application-content'

interface ApplyToJobParams {
  jobUrl: string
  resume: ParsedResume
  resumeFile: Buffer
  resumeFileName: string
  log: (message: string) => Promise<void>
  generatedCoverLetter?: string
  jobData: any
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
  generatedCoverLetter,
  jobData
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser to apply for Greenhouse job at: ${jobUrl}`)

  // Environment variable for remote browsers (Vercel Production)
  const browserWsEndpoint = process.env.BROWSER_WS_ENDPOINT
  const browser = browserWsEndpoint 
    ? await chromium.connect(browserWsEndpoint)
    : await chromium.launch({ headless: true })

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await log(`Successfully navigated to page: ${await page.title()}`)

    // --- Field Filling Logic ---
    await log('Attempting to fill basic information fields.')
    if (resume.name) await fillField(page, log, ['first name', 'given name'], resume.name.split(' ')[0] || '')
    if (resume.name) await fillField(page, log, ['last name', 'surname'], resume.name.split(' ').slice(1).join(' ') || '')
    if (resume.email) await fillField(page, log, ['email', 'email address'], resume.email)
    if (resume.phone) await fillField(page, log, ['phone', 'phone number'], resume.phone)
    if (resume.location) await fillField(page, log, ['location', 'city'], resume.location)

    // --- Cover Letter Logic ---
    if (generatedCoverLetter) {
      await fillTextArea(page, log, ['cover letter', 'cover_letter', 'message to hiring manager'], generatedCoverLetter)
    }

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

    // --- Custom Questions ---
    await log('Scanning for custom questions...')
    const customFields = await page.locator('.custom_field, .custom_question').all()
    for (const field of customFields) {
      const htmlSnippet = await field.evaluate(el => el.outerHTML)
      
      // Select dropdowns
      if (await field.locator('select').count() > 0) {
         try {
           const result = await selectDropdownOption(htmlSnippet, resume, jobData)
           if (result.selected_value && result.confidence_score > 0.6) {
              await field.locator('select').selectOption(result.selected_value)
              await log(`AI selected dropdown option: ${result.selected_value}`)
           }
         } catch (e) { await log('Failed to handle custom select') }
      } 
      // Checkboxes & Radios
      else if (await field.locator('input[type="radio"], input[type="checkbox"]').count() > 0) {
         try {
           const result = await selectCheckboxRadio(htmlSnippet, resume, jobData)
           if (result.selected_values && result.confidence_score > 0.6) {
              for (const val of result.selected_values) {
                // Ignore if it fails
                await field.locator(`input[value="${val}"]`).check().catch(() => {})
              }
              await log(`AI selected radios/checkboxes: ${result.selected_values.join(', ')}`)
           }
         } catch (e) { await log('Failed to handle custom radio/checkbox') }
      } 
      // General Text Inputs
      else if (await field.locator('input[type="text"], textarea').count() > 0) {
         try {
           const labelText = await field.locator('label').first().innerText().catch(() => htmlSnippet)
           if (labelText.toLowerCase().includes('cover letter') && generatedCoverLetter) continue; // Skip if already filled above
           
           const result = await generateApplicationContent(resume, jobData, 'answer_question', labelText)
           if (result) {
              const inputLoc = field.locator('input[type="text"], textarea').first()
              const isFilled = await inputLoc.evaluate((el: HTMLInputElement) => el.value.length > 0)
              if (!isFilled) {
                await inputLoc.fill(result).catch(() => {})
                await log(`AI answered text question: ${labelText.slice(0, 30)}...`)
              }
           }
         } catch (e) { await log('Failed to answer custom text field') }
      }
    }

    // --- Submit Button Logic ---
    await log('Attempting to submit application.')
    const submitButton = page.locator('input[type="submit"][value="Submit Application"], button#submit_app, button:has-text("Submit")').first()
    
    if (await submitButton.count() > 0) {
      await submitButton.click()
      await log('Clicked submit button.')
      
      // Wait for navigation or error message
      await page.waitForTimeout(4000)
    } else {
      await log('WARNING: Could not find the final Submit Application button.')
    }

    await log('Finished Greenhouse automation flow.')
    await page.screenshot({ path: `greenhouse-apply-final-${Date.now()}.png`, fullPage: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    await log(`ERROR: ${errorMessage}`)
    await page.screenshot({ path: `/tmp/greenhouse-apply-error-${Date.now()}.png` }).catch(() => {})
    throw new Error(`Greenhouse automation failed: ${errorMessage}`)
  } finally {
    await browser.close()
    await log('Browser closed.')
  }
}

async function fillField(page: Page, log: Function, labels: string[], value: string) {
  for (const label of labels) {
    let locator = page.getByLabel(label, { exact: false })
    if (await locator.count() === 0) locator = page.getByPlaceholder(label, { exact: false })
    if (await locator.count() > 0) {
      await locator.first().fill(value)
      await log(`Filled field ("${label}") with value: ${value}`)
      return
    }
  }
}

async function fillTextArea(page: Page, log: Function, labels: string[], value: string) {
  for (const label of labels) {
    const locator = page.getByLabel(label, { exact: false })
    if (await locator.count() > 0) {
      await locator.first().fill(value)
      await log(`Filled textarea ("${label}")`)
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
  const genericLocator = page.locator('input[type="file"]')
  if (await genericLocator.count() > 0) return genericLocator.first()
  return null
}
