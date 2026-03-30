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

const EMPTY_JOB_FORM = {
  title: '',
  company: '',
  location: '',
  type: 'full-time',
  description: '',
  skills: '',
  source: 'manual',
  source_url: '',
}

export function CompanyDashboardClient({ user }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  const [showPostForm, setShowPostForm] = useState(false)
  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

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
    if (jobForm.title.trim().length < 2 || jobForm.company.trim().length < 2) {
      setPostError('Please add a title and company name')
      return
    }
    if (jobForm.description.trim().length < 50) {
      setPostError('Please enter a job description (min 50 characters)')
      return
    }

    setPosting(true)
    setPostError('')

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobForm,
          location: jobForm.location || undefined,
          source_url: jobForm.source_url || undefined,
          skills: jobForm.skills
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPostError(data.error ?? 'Failed to post job')
        return
      }
      setJobs(prev => [data, ...prev])
      setJobForm(EMPTY_JOB_FORM)
      setShowPostForm(false)
    } catch {
      setPostError('Network error. Please try again')
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
    ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.match_score, 0) / candidates.length * 100)
    : null

  return (
    <div className="flex min-h-screen bg-transparent overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`
        fixed md:relative z-30 md:z-auto flex-shrink-0 w-64 h-full
        border-r border-white/8 bg-[linear-gradient(180deg,rgba(15,22,39,0.96),rgba(9,14,26,0.98))] backdrop-blur-xl flex flex-col shadow-[18px_0_40px_rgba(0,0,0,0.28)]
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
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
                className={`flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium transition-all
                  ${tab === item.id
                    ? 'border border-primary/30 bg-[linear-gradient(180deg,rgba(58,135,255,0.25),rgba(28,53,104,0.3))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(15,70,180,0.2)]'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-accent-foreground'
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
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-white/8 sticky top-0 bg-[rgba(8,12,20,0.85)] backdrop-blur-xl z-10">
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
                <p className="text-muted-foreground mt-1">Manage manually posted roles and review candidates as they come in.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Open roles</CardTitle>
                    <p className="text-3xl font-bold">{jobsLoading ? '-' : jobs.length}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Candidates received</CardTitle>
                    <p className="text-3xl font-bold">{candidates.length || '-'}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Avg. match score</CardTitle>
                    <p className="text-3xl font-bold">{avgScore !== null ? `${avgScore}%` : '-'}</p>
                  </CardHeader>
                </Card>
              </div>

              {jobs.length === 0 && !jobsLoading && (
                <div className="depth-surface rounded-[1.4rem] border-2 border-dashed border-white/10 p-10 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Post a job to start populating your company dashboard</p>
                  <p className="text-sm mt-1 mb-4">You can add jobs manually now and connect automated sourcing later.</p>
                  <Button onClick={() => { setTab('jobs'); setShowPostForm(true) }}>Post a Job</Button>
                </div>
              )}

              {jobs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent job postings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {jobs.slice(0, 3).map(job => (
                      <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{job.normalized_data.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.normalized_data.company} · {job.normalized_data.location ?? 'Remote'}
                          </p>
                        </div>
                        <Badge variant="secondary">{job.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Job Postings</h1>
                  <p className="text-muted-foreground mt-1">Add and review jobs without waiting on AI normalization.</p>
                </div>
                <Button onClick={() => setShowPostForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post new job
                </Button>
              </div>

              {showPostForm && (
                <div className="glass-panel rounded-[1.4rem] border border-white/8 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">New job posting</h2>
                    <button onClick={() => { setShowPostForm(false); setPostError('') }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={jobForm.title}
                      onChange={e => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Job title"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={jobForm.company}
                      onChange={e => setJobForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={jobForm.location}
                      onChange={e => setJobForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Location or Remote"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={jobForm.type}
                      onChange={e => setJobForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="remote">Remote</option>
                    </select>
                    <input
                      value={jobForm.skills}
                      onChange={e => setJobForm(prev => ({ ...prev, skills: e.target.value }))}
                      placeholder="Skills, comma separated"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
                    />
                    <input
                      value={jobForm.source}
                      onChange={e => setJobForm(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="Source, e.g. manual"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={jobForm.source_url}
                      onChange={e => setJobForm(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="Source URL (optional)"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <textarea
                    value={jobForm.description}
                    onChange={e => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Paste the full job description here"
                    rows={10}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                  />

                  {postError && <p className="text-sm text-destructive">{postError}</p>}

                  <div className="flex gap-3">
                    <Button onClick={handlePostJob} disabled={posting}>
                      {posting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {posting ? 'Saving...' : 'Post job'}
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
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No job postings yet</p>
                  <p className="text-sm mt-1">Click &quot;Post new job&quot; to create your first role</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="depth-surface flex items-start gap-4 p-4 border border-white/8 rounded-[1.25rem]">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{job.normalized_data.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {job.normalized_data.company} · {job.normalized_data.location ?? 'Remote'}
                          {job.normalized_data.type && ` · ${job.normalized_data.type}`}
                          {job.normalized_data.skills.length > 0 && ` · ${job.normalized_data.skills.slice(0, 3).join(', ')}`}
                        </p>
                        {job.source_url && (
                          <a
                            href={job.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary mt-1 inline-flex items-center gap-1"
                          >
                            View source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
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

          {tab === 'candidates' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Candidate Pipeline</h1>
                <p className="text-muted-foreground mt-1">Candidates who applied to your roles show up here when matching is enabled.</p>
              </div>

              {candidatesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : candidates.length === 0 ? (
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No candidates yet</p>
                  <p className="text-sm mt-1">As you add jobs and later enable matching, candidates will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map(candidate => (
                    <div key={candidate.id} className="depth-surface flex items-center gap-4 p-4 border border-white/8 rounded-[1.25rem]">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {candidate.candidates.full_name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{candidate.candidates.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.candidates.location ?? 'Location unknown'} · Applied to {candidate.jobs.normalized_data.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {Math.round(candidate.match_score * 100)}%
                        </span>
                        <Badge variant={candidate.status === 'interview' ? 'default' : candidate.status === 'applied' ? 'success' : 'secondary'}>
                          {candidate.status}
                        </Badge>
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
