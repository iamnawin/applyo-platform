'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Briefcase, Users, LogOut, Menu, X, ExternalLink, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Job } from '@/lib/types'

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
  candidates: {
    full_name: string
    email: string
    location: string | null
  }
  jobs: {
    normalized_data: { title: string; company: string }
  }
}

export function CompanyDashboardClient({ user }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  // Post job modal state
  const [showPostForm, setShowPostForm] = useState(false)
  const [jdText, setJdText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  // Candidates state
  const [candidates, setCandidates] = useState<CandidateProfile[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)

  useEffect(() => {
    if (tab === 'jobs' || tab === 'overview') {
      setJobsLoading(true)
      fetch('/api/jobs')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setJobs(data) })
        .finally(() => setJobsLoading(false))
    }
    if (tab === 'candidates') {
      setCandidatesLoading(true)
      fetch('/api/companies')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setCandidates(data) })
        .finally(() => setCandidatesLoading(false))
    }
  }, [tab])

  async function handlePostJob() {
    if (jdText.trim().length < 50) {
      setPostError('Please enter a job description (min 50 characters)')
      return
    }
    setPosting(true)
    setPostError('')
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: jdText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPostError(data.error ?? 'Failed to post job')
        return
      }
      setJobs(prev => [data, ...prev])
      setJdText('')
      setShowPostForm(false)
    } catch {
      setPostError('Network error — please try again')
    } finally {
      setPosting(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + c.match_score, 0) / candidates.length * 100)
    : null

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

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">HR Dashboard</h1>
                <p className="text-muted-foreground mt-1">Pre-scored, pre-verified candidates for your open roles</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Open roles</CardTitle>
                    <p className="text-3xl font-bold">{jobsLoading ? '—' : jobs.length}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Candidates received</CardTitle>
                    <p className="text-3xl font-bold">{candidates.length || '—'}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Avg. match score</CardTitle>
                    <p className="text-3xl font-bold">{avgScore !== null ? `${avgScore}%` : '—'}</p>
                  </CardHeader>
                </Card>
              </div>

              {jobs.length === 0 && !jobsLoading && (
                <div className="rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Post a job to start receiving candidates</p>
                  <p className="text-sm mt-1 mb-4">Aplio will score and rank applicants against your job description</p>
                  <Button onClick={() => { setTab('jobs'); setShowPostForm(true) }}>Post a Job</Button>
                </div>
              )}

              {jobs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent job postings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {jobs.slice(0, 3).map(job => (
                      <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{job.normalized_data.title}</p>
                          <p className="text-xs text-muted-foreground">{job.normalized_data.location ?? 'Remote'}</p>
                        </div>
                        <Badge variant="secondary">{job.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* JOBS TAB */}
          {tab === 'jobs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Job Postings</h1>
                  <p className="text-muted-foreground mt-1">Manage your open roles</p>
                </div>
                <Button onClick={() => setShowPostForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post new job
                </Button>
              </div>

              {/* Post job form */}
              {showPostForm && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">New job description</h2>
                    <button onClick={() => { setShowPostForm(false); setPostError('') }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste your full job description — Aplio&apos;s AI will extract the title, skills, salary, and requirements automatically.
                  </p>
                  <textarea
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                    placeholder="Senior Frontend Engineer at Acme Corp&#10;&#10;We're looking for a React developer with 3+ years experience..."
                    rows={10}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {postError && <p className="text-sm text-destructive">{postError}</p>}
                  <div className="flex gap-3">
                    <Button onClick={handlePostJob} disabled={posting}>
                      {posting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {posting ? 'Processing…' : 'Post job'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowPostForm(false); setPostError('') }} disabled={posting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {jobsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No job postings yet</p>
                  <p className="text-sm mt-1">Click &quot;Post new job&quot; to create your first role</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{job.normalized_data.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {job.normalized_data.location ?? 'Remote'}
                          {job.normalized_data.type && ` · ${job.normalized_data.type}`}
                          {job.normalized_data.skills?.length > 0 && ` · ${job.normalized_data.skills.slice(0, 3).join(', ')}`}
                        </p>
                      </div>
                      <Badge variant={job.status === 'active' ? 'success' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CANDIDATES TAB */}
          {tab === 'candidates' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
                <p className="text-muted-foreground mt-1">Candidates who applied to your roles — ranked by AI match score</p>
              </div>

              {candidatesLoading ? (
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
                        {c.candidates.full_name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{c.candidates.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.candidates.location ?? 'Location unknown'} · Applied to {c.jobs.normalized_data.title}
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
