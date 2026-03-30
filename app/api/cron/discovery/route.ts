import { NextResponse } from 'next/server'
import { getActiveTargetCompanies, updateTargetCompanyLastScraped } from '@/lib/db/target-companies'
import { orchestrateJobDiscovery } from '@/lib/automation/orchestrate-discovery'

export async function GET(request: Request) {
  // Typical security check for Vercel Cron
  // In production, ensure VERCEl_CRON_SECRET authorization header is present
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const companies = await getActiveTargetCompanies()
    
    // Sort companies by last modified, or oldest scraped
    const sorted = companies.sort((a, b) => {
      if (!a.last_scraped_at) return -1
      if (!b.last_scraped_at) return 1
      return new Date(a.last_scraped_at).getTime() - new Date(b.last_scraped_at).getTime()
    })

    // Take top 5 candidates per cron tick to avoid exceeding execution limits
    const targets = sorted.slice(0, 5)

    const results = []
    for (const company of targets) {
      console.log(`[Cron Discovery] Orchestrating discovery for: ${company.name}`)
      try {
        const resultMsg = await orchestrateJobDiscovery(company.name)
        await updateTargetCompanyLastScraped(company.id)
        results.push({ company: company.name, status: 'success', message: resultMsg })
      } catch (err) {
        console.error(`[Cron Discovery] Error orchestrating ${company.name}:`, err)
        results.push({ company: company.name, status: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }

    return NextResponse.json({ success: true, processed: targets.length, results })
  } catch (error) {
    console.error('[Cron Discovery] Fatal Error:', error)
    return NextResponse.json({ error: 'Server Error occurred during job discovery schedule' }, { status: 500 })
  }
}
