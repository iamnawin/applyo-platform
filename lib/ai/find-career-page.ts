import { google_web_search } from '@/lib/tools' // Assuming google_web_search is available as a tool
import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'

const careerPageSchema = z.object({
  career_page_url: z.string().url().nullable(),
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Finds the career page URL for a given company using web search.
 * @param companyName The name of the company.
 * @returns A career page URL, confidence score, and reasoning.
 */
export async function findCareerPage(companyName: string): Promise<z.infer<typeof careerPageSchema>> {
  const searchQuery = `${companyName} careers page`

  try {
    const searchResults = await google_web_search({ query: searchQuery })

    // Use AI to parse search results and extract the most likely career page URL
    const result = await runStructuredTextTask({
      taskName: 'find career page',
      systemPrompt: `Analyze the provided web search results to identify the most relevant career page URL for the company "${companyName}".
        Prioritize official company domains. If multiple URLs seem relevant, choose the one most directly related to job opportunities.
        If no clear career page is found, return null for career_page_url.
        Provide a confidence score (0-1) and a brief reasoning for your choice.`,
      userContent: `Company Name: ${companyName}\nWeb Search Results:\n${JSON.stringify(searchResults, null, 2)}`,
      schema: careerPageSchema,
    })
    return result
  } catch (error) {
    console.error(`Error finding career page for ${companyName}:`, error)
    return { career_page_url: null, confidence_score: 0, reasoning: `Failed to find career page due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}