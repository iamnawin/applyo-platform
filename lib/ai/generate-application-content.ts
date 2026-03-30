import { runStructuredTextTask } from '@/lib/ai/providers'
import type { ParsedResume, NormalizedJob } from '@/lib/types'
import { z } from 'zod'

/**
 * Generates dynamic application content (e.g., cover letter, answers to questions)
 * based on candidate's resume and job description.
 */
export async function generateApplicationContent(
  parsedResume: ParsedResume,
  normalizedJob: NormalizedJob,
  contentType: 'cover_letter' | 'answer_question',
  promptContext?: string, // For specific questions
): Promise<string> {
  let systemPrompt: string
  let userContent: string

  const resumeSummary = `
    Name: ${parsedResume.name}
    Email: ${parsedResume.email || 'N/A'}
    Phone: ${parsedResume.phone || 'N/A'}
    Location: ${parsedResume.location || 'N/A'}
    Summary: ${parsedResume.summary || 'N/A'}
    Skills: ${parsedResume.skills.join(', ') || 'N/A'}
    Experience:
      ${parsedResume.experience.map(exp => `- ${exp.title} at ${exp.company} (${exp.start} - ${exp.end})`).join('\n      ') || 'N/A'}
    Education:
      ${parsedResume.education.map(edu => `- ${edu.degree} from ${edu.institution} (${edu.year})`).join('\n      ') || 'N/A'}
    Languages: ${parsedResume.languages.join(', ') || 'N/A'}
  `

  const jobSummary = `
    Title: ${normalizedJob.title}
    Company: ${normalizedJob.company}
    Location: ${normalizedJob.location || 'N/A'}
    Type: ${normalizedJob.type || 'N/A'}
    Skills: ${normalizedJob.skills.join(', ') || 'N/A'}
    Experience Years: ${normalizedJob.experience_years || 'N/A'}
    Salary Range: ${normalizedJob.salary_range ? `${normalizedJob.salary_range.min}-${normalizedJob.salary_range.max} ${normalizedJob.salary_range.currency}` : 'N/A'}
    Description Summary: ${normalizedJob.description_summary || 'N/A'}
  `

  if (contentType === 'cover_letter') {
    systemPrompt = `You are an AI assistant specialized in writing compelling cover letters.
      Generate a concise cover letter (around 200-300 words) for the candidate applying to the job.
      Highlight how the candidate's skills and experience align with the job requirements.
      Address the letter to the hiring manager (if no name is available, use "Hiring Manager").
      Maintain a professional and enthusiastic tone.
      Return JSON: { "content": "The actual cover letter text goes here" }`
    userContent = `Candidate's Resume Summary:\n${resumeSummary}\n\nJob Description Summary:\n${jobSummary}`
  } else if (contentType === 'answer_question' && promptContext) {
    systemPrompt = `You are an AI assistant specialized in answering job application questions.
      Answer the following question based on the candidate's resume and the job description.
      Keep the answer concise and relevant.
      Return JSON: { "content": "The actual answer text goes here" }`
    userContent = `Candidate's Resume Summary:\n${resumeSummary}\n\nJob Description Summary:\n${jobSummary}\n\nQuestion: ${promptContext}`
  } else {
    throw new Error('Invalid content type or missing prompt context for question answering.')
  }

  try {
    const result = await runStructuredTextTask({
      taskName: `generate ${contentType}`,
      systemPrompt: systemPrompt,
      userContent: userContent,
      schema: z.object({ content: z.string() }),
    })
    return result.content
  } catch (error) {
    console.error(`Error generating ${contentType}:`, error)
    throw new Error(`Failed to generate ${contentType}.`)
  }
}