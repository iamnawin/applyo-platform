import type { Application, Job } from '@/lib/types'

// Route the application to the correct platform handler
export async function routeApply(applicationId: string): Promise<void> {
  // TODO: look up application + job source, route to platform handler
  // const { source } = await getJobSource(applicationId)
  // if (source === 'naukri') return applyNaukri(applicationId)
  // if (source === 'linkedin') return applyLinkedIn(applicationId)
  // if (source === 'indeed') return applyIndeed(applicationId)
  console.log(`[automation] routing application ${applicationId} — TODO`)
}
