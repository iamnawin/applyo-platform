import { routeApply } from './router'

export async function triggerApply(applicationId: string): Promise<void> {
  // Human-in-the-loop gate is enforced before calling this
  await routeApply(applicationId)
}
