import type { BrowserContext } from 'playwright-core'
import { getDecryptedCredentials, updateAccountStatus, type Platform } from '@/lib/services/platform-accounts'

const PLATFORM_DOMAINS: Record<Platform, string> = {
  linkedin: '.linkedin.com',
  indeed: '.indeed.com',
  naukri: '.naukri.com',
}

/**
 * Injects stored session cookies into a Playwright browser context.
 * Credentials are stored as JSON array of cookie objects.
 */
export async function injectSession(context: BrowserContext, candidateId: string, platform: Platform): Promise<boolean> {
  const raw = await getDecryptedCredentials(candidateId, platform)
  if (!raw) return false

  try {
    const cookies = JSON.parse(raw)
    if (!Array.isArray(cookies) || cookies.length === 0) return false

    const domain = PLATFORM_DOMAINS[platform]
    const prepared = cookies.map((c: Record<string, unknown>) => ({
      name: String(c.name ?? ''),
      value: String(c.value ?? ''),
      domain: String(c.domain ?? domain),
      path: String(c.path ?? '/'),
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure ?? true),
      sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') ?? 'None',
    }))

    await context.addCookies(prepared)
    return true
  } catch {
    await updateAccountStatus(candidateId, platform, 'expired')
    return false
  }
}

/**
 * Check if the page landed on a login wall after navigation.
 * If so, mark the account as expired.
 */
export async function checkSessionValid(pageUrl: string, candidateId: string, platform: Platform): Promise<boolean> {
  const url = pageUrl.toLowerCase()
  const isLoginWall =
    url.includes('/login') ||
    url.includes('/authwall') ||
    url.includes('/signin') ||
    url.includes('/checkpoint')

  if (isLoginWall) {
    await updateAccountStatus(candidateId, platform, 'expired')
    return false
  }
  return true
}
