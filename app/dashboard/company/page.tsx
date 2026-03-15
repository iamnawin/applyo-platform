import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyByUserId, createCompany } from '@/lib/db/companies'
import { CompanyDashboardClient } from './CompanyDashboardClient'

export default async function CompanyDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Auto-create company row on first visit
  const existing = await getCompanyByUserId(user.id)
  if (!existing) {
    try {
      await createCompany({
        user_id: user.id,
        name: user.user_metadata?.full_name ?? user.email ?? 'My Company',
      })
    } catch {
      // already exists or failed — proceed
    }
  }

  return (
    <CompanyDashboardClient
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '' }}
    />
  )
}
