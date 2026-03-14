'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Briefcase, Users, LogOut, Menu, X, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  user: { id: string; email: string; name: string }
}

type Tab = 'overview' | 'jobs' | 'candidates'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', label: 'Job Postings', icon: Briefcase },
  { id: 'candidates', label: 'Candidates', icon: Users },
] as const

interface CandidateProfile {
  id: string
  candidate_id: string
  job_id: string
  match_score: number
  status: string
  applied_at: string | null
  candidate: {
    full_name: string
    email: string
    location: string | null
  }
  job: {
    normalized_data: { title: string; company: string }
  }
}

export function CompanyDashboardClient({ user }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [candidates, setCandidates] = useState<CandidateProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab === 'candidates') {
      setLoading(true)
      fetch('/api/companies/candidates')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setCandidates(data) })
        .finally(() => setLoading(false))
    }
  }, [tab])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed md:relative z-30 md:z-auto flex-shrink-0 w-64 h-full
        border-r bg-card flex flex-col
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-6 border-b">
          <span className="text-xl font-bold tracking-tight">Aplio <span className="text-xs font-normal text-muted-foreground">HR</span></span>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id as Tab); setMobileOpen(false) }}
                className={`flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors
                  ${tab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name || 'Company'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Aplio HR</span>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">HR Dashboard</h1>
                <p className="text-muted-foreground mt-1">Pre-scored, pre-verified candidates for your open roles</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Candidates received</CardTitle>
                    <p className="text-3xl font-bold">—</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Avg. match score</CardTitle>
                    <p className="text-3xl font-bold">—</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Interviews scheduled</CardTitle>
                    <p className="text-3xl font-bold">0</p>
                  </CardHeader>
                </Card>
              </div>

              <div className="rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Post a job to start receiving candidates</p>
                <p className="text-sm mt-1 mb-4">Aplio will score and rank applicants against your job description</p>
                <Button onClick={() => setTab('jobs')}>Post a Job</Button>
              </div>
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Job Postings</h1>
                  <p className="text-muted-foreground mt-1">Manage your open roles</p>
                </div>
                <Button>Post new job</Button>
              </div>
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No job postings yet</p>
                <p className="text-sm mt-1">Click &quot;Post new job&quot; to create your first role</p>
              </div>
            </div>
          )}

          {tab === 'candidates' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
                <p className="text-muted-foreground mt-1">Candidates who applied to your roles — ranked by AI match score</p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No candidates yet</p>
                  <p className="text-sm mt-1">Post a job and Aplio will match and deliver candidates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map(c => (
                    <div key={c.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {c.candidate.full_name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{c.candidate.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.candidate.location ?? 'Location unknown'} · Applied to {c.job.normalized_data.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {Math.round(c.match_score * 100)}%
                        </span>
                        <Badge variant={c.status === 'interview' ? 'default' : c.status === 'applied' ? 'success' : 'secondary'}>
                          {c.status}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/dashboard/company/candidates/${c.candidate_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
