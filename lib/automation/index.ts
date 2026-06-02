import { routeApply } from './router'
import { logToApplication, updateApplicationAutomationStatus } from '@/lib/db/applications'

export async function triggerApply(applicationId: string, generatedCoverLetter?: string): Promise<void> {
  try {
    await routeApply(applicationId, generatedCoverLetter)
  } catch (error) {
    // Single retry after 5 seconds for transient failures
    const msg = error instanceof Error ? error.message : ''
    const retryable = msg.includes('timeout') || msg.includes('ECONNRESET') || msg.includes('net::')
    if (retryable) {
      await logToApplication(applicationId, 'Retrying after transient failure...').catch(() => {})
      await new Promise(resolve => setTimeout(resolve, 5000))
      try {
        await routeApply(applicationId, generatedCoverLetter)
      } catch {
        await updateApplicationAutomationStatus(applicationId, 'failed').catch(() => {})
      }
    }
  }
}
