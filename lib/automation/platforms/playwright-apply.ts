import { chromium, Page, Locator } from 'playwright-core'
import { ParsedResume, NormalizedJob } from '@/lib/types'
import { inferFieldPurpose } from '@/lib/ai/infer-field-purpose'
import { findSubmitButton } from '@/lib/ai/find-submit-button'
import { selectDropdownOption } from '@/lib/ai/select-dropdown-option'
import { selectCheckboxRadio } from '@/lib/ai/select-checkbox-radio'

export interface ApplyToJobParams {
  jobUrl: string
  resume: ParsedResume
  resumeFile: Buffer
  resumeFileName: string
  log: (message: string) => Promise<void>
  generatedCoverLetter?: string
  jobData: NormalizedJob
}

/**
 * Fallback generic job application script that infers fields.
 */
export async function applyToJob({
  jobUrl,
  resume,
  resumeFile,
  resumeFileName,
  log,
  generatedCoverLetter,
  jobData,
}: ApplyToJobParams): Promise<void> {
  await log(`Launching browser for generic job at: ${jobUrl}`)

  const browserWsEndpoint = process.env.BROWSER_WS_ENDPOINT
  const browser = browserWsEndpoint 
    ? await chromium.connect(browserWsEndpoint)
    : await chromium.launch({ headless: true })

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await log(`Successfully navigated to page: ${await page.title()}`)

    await log('Attempting to fill basic text fields using AI inference...')
    if (resume.name) await fillFieldAI(page, log, 'name', resume.name)
    if (resume.email) await fillFieldAI(page, log, 'email', resume.email)
    if (resume.phone) await fillFieldAI(page, log, 'phone', resume.phone)
    if (resume.location) await fillFieldAI(page, log, 'location', resume.location)

    if (generatedCoverLetter) {
      await fillTextAreaAI(page, log, 'cover_letter', generatedCoverLetter)
    } else if (resume.summary) {
      await fillTextAreaAI(page, log, 'summary', resume.summary)
    }

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
      await log('WARNING: Could not find a resume file input on the generic page.')
    }

    await log('Attempting to infer dropdowns...')
    const selectLocators = page.locator('select')
    const selectCount = await selectLocators.count()
    for (let i = 0; i < Math.min(selectCount, 5); i++) {
       const locator = selectLocators.nth(i)
       if (await locator.isVisible()) {
          const htmlSnippet = await locator.evaluate(el => el.outerHTML).catch(() => '')
          const res = await selectDropdownOption(htmlSnippet, resume, jobData)
          if (res.selected_value && res.confidence_score > 0.6) {
             await locator.selectOption(res.selected_value).catch(() => {})
             await log(`AI selected dropdown option: ${res.selected_value}`)
          }
       }
    }

    await log('Attempting to infer fieldsets (radios/checkboxes)...')
    const fieldsetLocators = page.locator('fieldset')
    const fieldsetCount = await fieldsetLocators.count()
    for (let i = 0; i < Math.min(fieldsetCount, 5); i++) {
        const fieldsetLocator = fieldsetLocators.nth(i)
        if (await fieldsetLocator.isVisible()) {
           const htmlSnippet = await fieldsetLocator.evaluate(el => el.outerHTML).catch(() => '')
           const res = await selectCheckboxRadio(htmlSnippet, resume, jobData)
           if (res.selected_values && res.confidence_score > 0.6) {
              for (const val of res.selected_values) {
                 await fieldsetLocator.locator(`input[value="${val}"]`).check().catch(() => {})
              }
              await log(`AI selected radios/checkboxes: ${res.selected_values.join(', ')}`)
           }
        }
    }

    await log('Finding submit button...')
    const submitHTML = await page.content()
    const submitResult = await findSubmitButton(submitHTML)
    
    if (submitResult.selector && submitResult.confidence_score > 0.6) {
       await page.locator(submitResult.selector).click().catch(() => {})
       await log(`Clicked AI-inferred submit button.`)
       await page.waitForTimeout(4000)
    } else {
       // fallback
       const commonSubmit = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")').first()
       if (await commonSubmit.count() > 0) {
          await commonSubmit.click()
          await log('Clicked fallback submit button.')
          await page.waitForTimeout(4000)
       }
    }

    await log('Finished generic automation flow.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    await log(`ERROR: ${errorMessage}`)
    throw new Error(`Playwright generic automation failed: ${errorMessage}`)
  } finally {
    await browser.close()
    await log('Browser closed.')
  }
}

async function fillFieldAI(page: Page, log: Function, targetPurpose: string, value: string) {
  const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]')
  const count = await inputs.count()
  for (let i = 0; i < Math.min(count, 15); i++) {
    const loc = inputs.nth(i)
    if (await loc.isVisible()) {
      const html = await loc.evaluate(el => el.outerHTML).catch(() => '')
      const inferred = await inferFieldPurpose(html)
      if (inferred.confidence_score > 0.6 && inferred.inferred_purpose === targetPurpose) {
         await loc.fill(value).catch(() => {})
         await log(`AI filled field ("${targetPurpose}"): ${value.slice(0, 10)}...`)
         return
      }
    }
  }
}

async function fillTextAreaAI(page: Page, log: Function, targetPurpose: string, value: string) {
  const textareas = page.locator('textarea')
  const count = await textareas.count()
  for (let i = 0; i < Math.min(count, 5); i++) {
    const loc = textareas.nth(i)
    if (await loc.isVisible()) {
      const html = await loc.evaluate(el => el.outerHTML).catch(() => '')
      const inferred = await inferFieldPurpose(html)
      if (inferred.confidence_score > 0.6 && inferred.inferred_purpose === targetPurpose) {
         await loc.fill(value).catch(() => {})
         await log(`AI filled text area ("${targetPurpose}")`)
         return
      }
    }
  }
}

async function findFileInput(page: Page): Promise<Locator | null> {
  const loc = page.locator('input[type="file"]')
  if (await loc.count() > 0) return loc.first()
  return null
}
