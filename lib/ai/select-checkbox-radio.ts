import { runStructuredTextTask } from '@/lib/ai/providers'
import { z } from 'zod'
import type { ParsedResume, NormalizedJob } from '@/lib/types'

const checkboxRadioSelectionSchema = z.object({
  selected_values: z.array(z.string()).nullable(), // The values of the options to select
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * Uses AI to select the most appropriate options from a checkbox or radio button group
 * based on candidate and job data.
 * @param htmlSnippet A small HTML snippet containing the checkbox/radio group.
 * @param candidateData The candidate's parsed resume data.
 * @param jobData The normalized job data.
 * @param targetPurpose An optional hint about the group's purpose (e.g., 'gender', 'work_authorization_status').
 * @returns The values of the options to select, confidence score, and reasoning.
 */
export async function selectCheckboxRadio(
  htmlSnippet: string,
  candidateData: ParsedResume,
  jobData: NormalizedJob,
  targetPurpose?: string,
): Promise<z.infer<typeof checkboxRadioSelectionSchema>> {
  try {
    const result = await runStructuredTextTask({
      taskName: 'select checkbox/radio option',
      systemPrompt: `Analyze the provided HTML snippet of a checkbox or radio button group and the candidate's profile and job description.
        Select the most appropriate option(s) from the group.
        Consider the group's purpose (if provided), the candidate's data, and the job's requirements.
        Return the 'value' attribute(s) of the chosen input element(s). If no suitable option is found, return null.
        For checkboxes, you can select multiple values. For radio buttons, select only one.
        Provide a confidence score (0-1) and a brief reasoning for your choice.`,
      userContent: `Checkbox/Radio HTML:\n${htmlSnippet}\n\nCandidate Data:\n${JSON.stringify(candidateData, null, 2)}\n\nJob Data:\n${JSON.stringify(jobData, null, 2)}\n\nGroup Purpose Hint: ${targetPurpose || 'None'}`,
      schema: checkboxRadioSelectionSchema,
    })
    return result
  } catch (error) {
    console.error(`Error selecting checkbox/radio option from snippet:`, htmlSnippet, error)
    return { selected_values: null, confidence_score: 0, reasoning: `Failed to select option due to error: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
