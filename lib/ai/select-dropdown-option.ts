import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'
import type { ParsedResume, NormalizedJob } from '@/lib/types'

const dropdownSelectionSchema = z.object({
  selected_value: z.string().nullable(), // The value of the option to select
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Uses AI to select the most appropriate option from a dropdown based on candidate and job data.
 * @param htmlSnippet A small HTML snippet containing the <select> element and its <option>s.
 * @param candidateData The candidate's parsed resume data.
 * @param jobData The normalized job data.
 * @param targetPurpose An optional hint about the dropdown's purpose (e.g., 'pronouns', 'work_authorization').
 * @returns The value of the option to select, confidence score, and reasoning.
 */
export async function selectDropdownOption(
  htmlSnippet: string,
  candidateData: ParsedResume,
  jobData: NormalizedJob,
  targetPurpose?: string,
): Promise<z.infer<typeof dropdownSelectionSchema>> {
  try {
    const result = await runStructuredTextTask({
      taskName: 'select dropdown option',
      systemPrompt: `Analyze the provided HTML snippet of a dropdown (<select> element) and the candidate's profile and job description.
        Select the most appropriate option from the dropdown.
        Consider the dropdown's purpose (if provided), the candidate's data, and the job's requirements.
        Return the 'value' attribute of the chosen <option> element. If no suitable option is found, return null.
        Provide a confidence score (0-1) and a brief reasoning for your choice.`,
      userContent: `Dropdown HTML:\n${htmlSnippet}\n\nCandidate Data:\n${JSON.stringify(candidateData, null, 2)}\n\nJob Data:\n${JSON.stringify(jobData, null, 2)}\n\nDropdown Purpose Hint: ${targetPurpose || 'None'}`,
      schema: dropdownSelectionSchema,
    })
    return result
  } catch (error) {
    console.error(`Error selecting dropdown option from snippet:`, htmlSnippet, error)
    return { selected_value: null, confidence_score: 0, reasoning: `Failed to select option due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
