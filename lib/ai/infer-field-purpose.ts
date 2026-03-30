import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'

const fieldPurposeSchema = z.object({
  inferred_purpose: z.string(), // e.g., 'name', 'email', 'phone', 'address', 'cover_letter', 'summary', 'skills', 'experience', 'education', 'unknown'
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Infers the purpose of a form field based on its HTML attributes and surrounding text.
 * @param htmlSnippet A small HTML snippet containing the input field and its immediate context.
 * @returns The inferred purpose of the field, confidence score, and reasoning.
 */
export async function inferFieldPurpose(htmlSnippet: string): Promise<z.infer<typeof fieldPurposeSchema>> {
  try {
    const result = await runStructuredTextTask({
      taskName: 'infer form field purpose',
      systemPrompt: `Analyze the provided HTML snippet of a form field.
        Infer the most likely purpose of this field (e.g., 'name', 'email', 'phone', 'address', 'cover_letter', 'summary', 'skills', 'experience', 'education', 'job_title', 'company_name', 'location', 'salary', 'work_authorization', 'industry', 'target_company', 'desired_role', 'unknown').
        Consider labels, placeholders, input names, IDs, and surrounding text.
        Return the inferred purpose, a confidence score (0-1), and a brief reasoning.`,
      userContent: `HTML Snippet:\n${htmlSnippet}`,
      schema: fieldPurposeSchema,
    })
    return result
  } catch (error) {
    console.error(`Error inferring field purpose from snippet:`, htmlSnippet, error)
    return { inferred_purpose: 'unknown', confidence_score: 0, reasoning: `Failed to infer purpose due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
