import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCandidateByUserId } from '@/lib/db/candidates'
import { linkPlatformAccount, getLinkedAccounts, unlinkPlatformAccount, type Platform } from '@/lib/services/platform-accounts'

const VALID_PLATFORMS: Platform[] = ['linkedin', 'indeed', 'naukri']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const accounts = await getLinkedAccounts(candidate.id)
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const { platform, credentials } = await req.json()
  if (!VALID_PLATFORMS.includes(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  if (!credentials || typeof credentials !== 'string') return NextResponse.json({ error: 'credentials required' }, { status: 400 })

  try {
    const account = await linkPlatformAccount(candidate.id, platform, credentials)
    return NextResponse.json(account)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to link' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidate = await getCandidateByUserId(user.id)
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const { platform } = await req.json()
  if (!VALID_PLATFORMS.includes(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  await unlinkPlatformAccount(candidate.id, platform)
  return NextResponse.json({ success: true })
}
