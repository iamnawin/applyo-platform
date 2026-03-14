'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Settings, ListChecks, History, LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ResumeUploader } from '@/components/candidate/ResumeUploader'
import { PreferenceForm } from '@/components/candidate/PreferenceForm'
import { ApprovalQueueCard } from '@/components/candidate/ApprovalQueueCard'
import { ApplicationRow } from '@/components/candidate/ApplicationRow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Resume, Candidate, Application, Job } from '@/lib/types'

interface Props {
  user: { id: string; email: string; name: string }
  candidate: Candidate | null
  initialResumes: Resume[]
}

type Tab = 'overview' | 'resume' | 'preferences' | 'queue' | 'applications'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'queue', label: 'Approval Queue', icon: ListChecks },
  { id: 'applications', label: 'Applications', icon: History },
] as const

type ApplicationWithJob = Application & { job: Job }

export function CandidateDashboardClient({ user, candidate, initialResumes }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [resumes, setResumes] = useState<Resume[]>(initialResumes)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Queue state
  const [queue, setQueue] = useState<ApplicationWithJob[]>([])
  const [queueLoaded, setQueueLoaded] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)

  // Applications history state
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [appsLoaded, setAppsLoaded] = useState(false)
  const [appsLoading, setAppsLoading] = useState(false)

  const loadQueue = useCallback(async () => {
    if (queueLoaded) return
    setQueueLoading(true)
    try {
      const res = await fetch('/api/approvals')
      if (res.ok) setQueue(await res.json())
    } finally {
      setQueueLoading(false)
      setQueueLoaded(true)
    }
  }, [queueLoaded])

  const loadApplications = useCallback(async () => {
    if (appsLoaded) return
    setAppsLoading(true)
    try {
      const res = await fetch('/api/applications')
      if (res.ok) setApplications(await res.json())
    } finally {
      setAppsLoading(false)
      setAppsLoaded(true)
    }
  }, [appsLoaded])

  useEffect(() => {
    if (tab === 'queue') loadQueue()
    if (tab === 'applications') loadApplications()
  }, [tab, loadQueue, loadApplications])

  // Reload queue count on overview
  useEffect(() => {
    if (tab === 'overview') {
      fetch('/api/approvals').then(r => r.ok ? r.json() : []).then(setQueue).catch(() => {})
    }
  }, [tab])

  function handleQueueAction(id: string) {
    setQueue(prev => prev.filter(a => a.id !== id))
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const latestResume = resumes[0]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 md:z-auto flex-shrink-0 w-64 h-full
        border-r bg-card flex flex-col
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-6 border-b">
          <Link href="/" className="text-xl font-bold tracking-tight">Aplio</Link>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon
            const isQueue = item.id === 'queue'
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
                {isQueue && queue.length > 0 && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {queue.length}
                  </span>
                )}
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
              <p className="text-sm font-medium truncate">{user.name || 'Candidate'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Aplio</span>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
                <p className="text-muted-foreground mt-1">Here&apos;s your Aplio snapshot</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Resume"
                  value={resumes.length > 0 ? 'Uploaded' : 'Not uploaded'}
                  sub={latestResume ? 'Parsed & ready' : 'Upload to get started'}
                  accent={resumes.length > 0}
                />
                <StatCard
                  label="Preferences"
                  value={candidate ? 'Set' : 'Not set'}
                  sub={candidate ? 'Aplio is finding jobs' : 'Set your target roles'}
                  accent={!!candidate}
                />
                <StatCard
                  label="Queue"
                  value={`${queue.length} pending`}
                  sub="Jobs awaiting your approval"
                  accent={queue.length > 0}
                />
              </div>

              {resumes.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
                  <p className="font-semibold text-lg">Start by uploading your resume</p>
                  <p className="text-muted-foreground text-sm mt-1 mb-4">Aplio will parse it and start finding matching jobs for you</p>
                  <Button onClick={() => setTab('resume')}>Upload Resume</Button>
                </div>
              )}

              {latestResume && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Latest resume</h2>
                  <div className="rounded-lg border p-4 flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{latestResume.parsed_data.name}</p>
                      <p className="text-sm text-muted-foreground">{latestResume.parsed_data.skills?.slice(0, 4).join(', ')}</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setTab('queue')}>
                  <ListChecks className="h-4 w-4 mr-2" />
                  Review jobs {queue.length > 0 && `(${queue.length})`}
                </Button>
                <Button variant="outline" onClick={() => setTab('applications')}>
                  <History className="h-4 w-4 mr-2" />
                  View applications
                </Button>
              </div>
            </div>
          )}

          {/* RESUME */}
          {tab === 'resume' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Resume</h1>
                <p className="text-muted-foreground mt-1">Upload your latest resume — Aplio will parse and embed it automatically</p>
              </div>
              <ResumeUploader onUploaded={r => {
                setResumes(prev => [r, ...prev])
                setQueueLoaded(false) // force re-fetch queue after new resume
              }} />
              {resumes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your resumes</h2>
                  <div className="space-y-3">
                    {resumes.map((r, i) => (
                      <div key={r.id} className="rounded-lg border p-4 flex items-center gap-4">
                        <FileText className="h-6 w-6 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{r.parsed_data.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.parsed_data.skills?.slice(0, 3).join(', ')} · {r.parsed_data.experience?.length ?? 0} roles
                          </p>
                        </div>
                        {i === 0 && <Badge variant="success">Active</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PREFERENCES */}
          {tab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Preferences</h1>
                <p className="text-muted-foreground mt-1">Tell Aplio what jobs to find and apply to on your behalf</p>
              </div>
              <PreferenceForm onSaved={() => {}} />
            </div>
          )}

          {/* QUEUE */}
          {tab === 'queue' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Approval Queue</h1>
                <p className="text-muted-foreground mt-1">Review AI-matched jobs before Aplio applies. You must approve each one.</p>
              </div>
              {queueLoading && (
                <div className="text-center py-12 text-muted-foreground text-sm">Loading matches…</div>
              )}
              {!queueLoading && queue.length === 0 && (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                  <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No jobs pending approval</p>
                  <p className="text-sm mt-1">Upload your resume and Aplio will find matching jobs for you.</p>
                </div>
              )}
              {!queueLoading && queue.length > 0 && (
                <div className="space-y-4">
                  {queue.map(app => (
                    <ApprovalQueueCard key={app.id} application={app} onAction={handleQueueAction} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPLICATIONS */}
          {tab === 'applications' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-muted-foreground mt-1">Track every job Aplio has applied to on your behalf</p>
              </div>
              {appsLoading && (
                <div className="text-center py-12 text-muted-foreground text-sm">Loading applications…</div>
              )}
              {!appsLoading && applications.length === 0 && (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No applications yet</p>
                  <p className="text-sm mt-1">Approve jobs in the queue and Aplio will apply for you.</p>
                </div>
              )}
              {!appsLoading && applications.length > 0 && (
                <div className="space-y-3">
                  {applications.map(app => (
                    <ApplicationRow key={app.id} application={app} />
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

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/30 bg-primary/5' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}
