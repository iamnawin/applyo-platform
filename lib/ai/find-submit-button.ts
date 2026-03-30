import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'

const submitButtonSchema = z.object({
  selector: z.string().nullable(), // CSS selector for the submit button
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Identifies the most likely submit button on a form based on HTML context.
 * @param htmlSnippet A small HTML snippet containing potential submit buttons and their immediate context.
 * @returns A CSS selector for the submit button, confidence score, and reasoning.
 */
export async function findSubmitButton(htmlSnippet: string): Promise<z.infer<typeof submitButtonSchema>> {
  try {
    const result = await runStructuredTextTask({
      taskName: 'find submit button',
      systemPrompt: `Analyze the provided HTML snippet to identify the most likely submit button for a form.
        Look for buttons with text like 'Submit', 'Apply', 'Send', 'Next', 'Continue', or input elements with type='submit'.
        Consider context, such as being the last interactive element in a form or having primary styling.
        Return a CSS selector that uniquely identifies this button (e.g., 'button[type="submit"]', 'input[value="Apply"]', '#submit-btn').
        If no clear submit button is found, return null for selector.
        Provide a confidence score (0-1) and a brief reasoning for your choice.`,
      userContent: `HTML Snippet:\n${htmlSnippet}`,
      schema: submitButtonSchema,
    })
    return result
  } catch (error) {
    console.error(`Error finding submit button from snippet:`, htmlSnippet, error)
    return { selector: null, confidence_score: 0, reasoning: `Failed to find submit button due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}