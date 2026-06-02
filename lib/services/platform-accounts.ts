import { createServerClient } from '@/lib/db/client'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.PLATFORM_CREDENTIALS_KEY
  if (!key) throw new Error('PLATFORM_CREDENTIALS_KEY not configured')
  return Buffer.from(key, 'hex')
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8')
}

export type Platform = 'linkedin' | 'indeed' | 'naukri'

export interface PlatformAccount {
  id: string
  candidate_id: string
  platform: Platform
  status: 'active' | 'expired' | 'revoked'
  linked_at: string
  expires_at: string | null
}

export async function linkPlatformAccount(candidateId: string, platform: Platform, credentials: string) {
  const db = createServerClient()
  const { data, error } = await db
    .from('platform_accounts')
    .upsert({
      candidate_id: candidateId,
      platform,
      credentials_encrypted: encrypt(credentials),
      status: 'active',
      linked_at: new Date().toISOString(),
    }, { onConflict: 'candidate_id,platform' })
    .select('id, candidate_id, platform, status, linked_at, expires_at')
    .single()
  if (error) throw error
  return data as PlatformAccount
}

export async function getLinkedAccounts(candidateId: string): Promise<PlatformAccount[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('platform_accounts')
    .select('id, candidate_id, platform, status, linked_at, expires_at')
    .eq('candidate_id', candidateId)
  if (error) throw error
  return (data ?? []) as PlatformAccount[]
}

export async function getDecryptedCredentials(candidateId: string, platform: Platform): Promise<string | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('platform_accounts')
    .select('credentials_encrypted, status')
    .eq('candidate_id', candidateId)
    .eq('platform', platform)
    .eq('status', 'active')
    .single()
  if (error || !data) return null
  return decrypt(data.credentials_encrypted)
}

export async function updateAccountStatus(candidateId: string, platform: Platform, status: 'active' | 'expired' | 'revoked') {
  const db = createServerClient()
  await db.from('platform_accounts').update({ status }).eq('candidate_id', candidateId).eq('platform', platform)
}

export async function unlinkPlatformAccount(candidateId: string, platform: Platform) {
  const db = createServerClient()
  await db.from('platform_accounts').delete().eq('candidate_id', candidateId).eq('platform', platform)
}
