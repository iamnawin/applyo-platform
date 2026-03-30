import { web_fetch } from '@/lib/utils/web' // Standard fetch utility
import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'

const atsDetectionSchema = z.object({
  ats_platform: z.string().nullable(), // e.g., 'greenhouse', 'lever', 'workday', 'other', null
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Detects the Applicant Tracking System (ATS) used by a company from its career page URL.
 * @param careerPageUrl The URL of the company's career page.
 * @returns The detected ATS platform, confidence score, and reasoning.
 */
export async function detectATS(careerPageUrl: string): Promise<z.infer<typeof atsDetectionSchema>> {
  try {
    // Fetch the content of the career page
    const pageContent = await web_fetch({ prompt: `Fetch the content of ${careerPageUrl}` })

    // Use AI to analyze the page content and detect the ATS
    const result = await runStructuredTextTask({
      taskName: 'detect ATS',
      systemPrompt: `Analyze the provided web page content to detect the Applicant Tracking System (ATS) used.
        Look for keywords, URLs, script includes, or specific HTML patterns indicative of known ATS platforms like 'Greenhouse', 'Lever', 'Workday', 'SmartRecruiters', 'Jobvite', 'Workable'.
        If an ATS is detected, return its name (lowercase). If no specific ATS is confidently identified, return 'other' or null.
        Provide a confidence score (0-1) and a brief reasoning for your detection.`,
      userContent: `Career Page URL: ${careerPageUrl}\nPage Content:\n${pageContent}`,
      schema: atsDetectionSchema,
    })
    return result
  } catch (error) {
    console.error(`Error detecting ATS for ${careerPageUrl}:`, error)
    return { ats_platform: null, confidence_score: 0, reasoning: `Failed to detect ATS due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
