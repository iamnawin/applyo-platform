import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyDashboardClient } from './CompanyDashboardClient'

export default async function CompanyDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <CompanyDashboardClient
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '' }}
    />
  )
}
