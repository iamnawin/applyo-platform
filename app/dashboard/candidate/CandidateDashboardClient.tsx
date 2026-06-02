'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Settings, ListChecks, History, LogOut, Menu, X, Edit, Search, MessageSquare, Loader2, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ResumeUploader } from '@/components/candidate/ResumeUploader'
import { PreferenceWizard } from '@/components/candidate/PreferenceWizard'
import { ResumeProfileForm } from '@/components/candidate/ResumeProfileForm'
import { ApprovalQueueCard } from '@/components/candidate/ApprovalQueueCard'
import { ApplicationRow } from '@/components/candidate/ApplicationRow'
import { JobDetailModal } from '@/components/candidate/JobDetailModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { Resume, Candidate, Application, Job, Preference, ParsedResume } from '@/lib/types'

interface Props {
  user: { id: string; email: string; name: string }
  candidate: Candidate | null
  initialResumes: Resume[]
  initialPreferences: Preference | null
}

type Tab = 'overview' | 'resume' | 'resume-profile' | 'preferences' | 'queue' | 'applications' | 'chat'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume', label: 'Upload Resume', icon: FileText },
  { id: 'resume-profile', label: 'Edit Resume Profile', icon: Edit },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'queue', label: 'Approval Queue', icon: ListChecks },
  { id: 'applications', label: 'Applications', icon: History },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
] as const

type ApplicationWithJob = Application & { job: Job }
type SuggestedJob = {
  job: Job
  score: number
  reasons: string[]
}

export function CandidateDashboardClient({ user, candidate, initialResumes, initialPreferences }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [resumes, setResumes] = useState<Resume[]>(initialResumes)
  const [preferences, setPreferences] = useState<Preference | null>(initialPreferences)
  const [resumeProfileData, setResumeProfileData] = useState<ParsedResume | null>(null) // New state for resume profile
  const [mobileOpen, setMobileOpen] = useState(false)

  const [queue, setQueue] = useState<ApplicationWithJob[]>([])
  const [queueLoaded, setQueueLoaded] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [suggestedJobs, setSuggestedJobs] = useState<SuggestedJob[]>([])
  const [suggestedLoading, setSuggestedLoading] = useState(false)

  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [appsLoaded, setAppsLoaded] = useState(false)
  const [appsLoading, setAppsLoading] = useState(false)

  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState<{ jobsFound: number; jobsStored: number } | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedJob | null>(null)
  const [autoDiscoverAttempted, setAutoDiscoverAttempted] = useState(false)
  const latestResume = resumes[0]
  const latestResumeReady = !latestResume?.processing_status || latestResume.processing_status === 'ready'
  const latestResumeSub = !latestResume
    ? 'Upload to get started'
    : latestResumeReady
      ? 'Parsed & ready'
      : 'Stored, parsing pending'

  const loadQueue = useCallback(async (force = false) => {
    if (queueLoaded && !force) return
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

  const loadResumeProfile = useCallback(async () => {
    if (!candidate?.id) return
    try {
      const res = await fetch(`/api/candidate/${candidate.id}/resume-profile`)
      if (res.ok) {
        const data = await res.json()
        setResumeProfileData(data)
      }
    } catch (error) {
      console.error('Failed to load resume profile:', error)
    }
  }, [candidate?.id])

  useEffect(() => {
    if (tab === 'queue') loadQueue()
    if (tab === 'applications') loadApplications()
    if (tab === 'resume-profile') loadResumeProfile() // Load resume profile when tab is active
  }, [tab, loadQueue, loadApplications, loadResumeProfile])

  useEffect(() => {
    if (tab === 'overview') {
      fetch('/api/approvals').then(r => r.ok ? r.json() : []).then(setQueue).catch(() => {})
      setSuggestedLoading(true)
      fetch('/api/matches')
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setSuggestedJobs(data) })
        .catch(() => {})
        .finally(() => setSuggestedLoading(false))
    }
  }, [tab])

  function handleQueueAction(id: string, action?: string, applyMethod?: string) {
    setQueue(prev => prev.filter(a => a.id !== id))
    if (action === 'approved' && applyMethod) {
      if (applyMethod === 'api_direct') toast('✓ Application submitted instantly!', 'success')
      else if (applyMethod === 'browser_queued') toast('⏳ Applying in background...', 'success')
      else if (applyMethod === 'manual') toast('📋 Moved to assisted apply', 'success')
    }
  }

  async function approveApplication(app: ApplicationWithJob) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: app.id, action: 'approved' }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Approval failed')
      return {
        id: app.id,
        automationStatus: data.automation_status as string | undefined,
      }
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function handleApproveAll() {
    if (queue.length === 0) return
    setApprovingAll(true)
    const approvedIds = new Set<string>()
    let assisted = 0
    let automated = 0
    let failed = 0

    const batchSize = 6
    for (let index = 0; index < queue.length; index += batchSize) {
      const batch = queue.slice(index, index + batchSize)
      const results = await Promise.allSettled(batch.map(approveApplication))
      for (const result of results) {
        if (result.status === 'fulfilled') {
          approvedIds.add(result.value.id)
          if (result.value.automationStatus === 'manual') assisted++
          else automated++
        } else {
          failed++
        }
      }
    }

    setQueue(prev => prev.filter(app => !approvedIds.has(app.id)))
    setAppsLoaded(false)
    setApprovingAll(false)

    const parts = [
      `${approvedIds.size} approved`,
      assisted > 0 ? `${assisted} moved to assisted apply` : null,
      automated > 0 ? `${automated} automation started` : null,
      failed > 0 ? `${failed} failed` : null,
    ].filter(Boolean)
    toast(parts.join(', '), failed > 0 ? 'error' : 'success')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDiscoverJobs = useCallback(async () => {
    setDiscovering(true)
    setDiscoverResult(null)
    try {
      const res = await fetch('/api/jobs/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        const data = await res.json()
        setDiscoverResult(data)
        setQueueLoaded(false)
        await loadQueue(true)
        fetch('/api/matches')
          .then(r => r.ok ? r.json() : [])
          .then(data => { if (Array.isArray(data)) setSuggestedJobs(data) })
          .catch(() => {})
        toast(`Found ${data.jobsFound} jobs, ${data.jobsStored} stored, ${data.matchesCreated ?? 0} queued!`, 'success')
      } else {
        const data = await res.json().catch(() => ({}))
        toast(data.error || 'Failed to discover jobs. Please try again.', 'error')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Network error. Check your connection.', 'error')
    } finally {
      setDiscovering(false)
    }
  }, [loadQueue, toast])

  useEffect(() => {
    if (
      tab === 'overview' &&
      latestResumeReady &&
      !suggestedLoading &&
      suggestedJobs.length === 0 &&
      queue.length === 0 &&
      !discovering &&
      !autoDiscoverAttempted
    ) {
      setAutoDiscoverAttempted(true)
      handleDiscoverJobs()
    }
  }, [tab, latestResumeReady, suggestedLoading, suggestedJobs.length, queue.length, discovering, autoDiscoverAttempted, handleDiscoverJobs])

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
          <Link href="/" className="text-xl font-bold tracking-tight">Applyo</Link>
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
                className={`flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium transition-all
                  ${tab === item.id
                    ? 'border border-primary/30 bg-[linear-gradient(180deg,rgba(58,135,255,0.25),rgba(28,53,104,0.3))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(15,70,180,0.2)]'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-accent-foreground'
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

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-white/8 sticky top-0 bg-[rgba(8,12,20,0.85)] backdrop-blur-xl z-10">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Applyo</span>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
                <p className="text-muted-foreground mt-1">Here&apos;s your Applyo snapshot</p>
              </div>

              {/* Onboarding Progress */}
              <OnboardingStepper
                hasResume={resumes.length > 0}
                hasPreferences={!!preferences}
                hasQueue={queue.length > 0}
                onNavigate={setTab}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Resume"
                  value={resumes.length > 0 ? 'Uploaded' : 'Not uploaded'}
                  sub={latestResumeSub}
                  accent={resumes.length > 0}
                />
                <StatCard
                  label="Preferences"
                  value={preferences ? 'Set' : 'Not set'}
                  sub={preferences ? 'Applyo is finding jobs' : 'Set your target roles'}
                  accent={!!preferences}
                />
                <StatCard
                  label="Queue"
                  value={`${queue.length} pending`}
                  sub="Jobs awaiting your approval"
                  accent={queue.length > 0}
                />
              </div>

              {resumes.length === 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-base">Start by uploading your resume</p>
                    <p className="text-muted-foreground text-sm mt-0.5">Applyo will parse it and start finding matching jobs for you automatically</p>
                  </div>
                  <ResumeUploader
                    onUploaded={r => {
                      setResumes([r])
                      setQueueLoaded(false)
                      fetch('/api/preferences').then(res => res.ok ? res.json() : null).then(p => { if (p) setPreferences(p) }).catch(() => {})
                    }}
                    onDiscoveryComplete={(matchCount) => {
                      if (matchCount > 0) {
                        setQueueLoaded(false)
                        loadQueue(true)
                        setTab('queue')
                      }
                    }}
                  />
                </div>
              )}

              {latestResume && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Latest resume</h2>
                  <div className="depth-surface rounded-[1.25rem] border border-white/8 p-4 flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {latestResumeReady ? latestResume.parsed_data.name : 'Resume uploaded'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {latestResumeReady
                          ? latestResume.parsed_data.skills?.slice(0, 4).join(', ')
                          : 'Stored safely. AI parsing is pending until provider credits are available.'}
                      </p>
                    </div>
                    <Badge variant={latestResumeReady ? 'success' : 'warning'}>
                      {latestResumeReady ? 'Active' : 'Pending AI'}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-base">Suggested jobs</p>
                  <p className="text-muted-foreground text-sm mt-0.5">Resume-first suggestions from stored and discovered jobs across sources.</p>
                </div>
                {suggestedLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="depth-surface rounded-[1.25rem] border border-white/8 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : suggestedJobs.length === 0 ? (
                  <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No suggestions yet</p>
                    <p className="text-sm mt-1 mb-4">
                      Click &quot;Discover Jobs&quot; to find matching opportunities from your resume.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDiscoverJobs}
                      disabled={discovering}
                    >
                      {discovering ? 'Discovering...' : 'Discover Jobs'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestedJobs.slice(0, 20).map(suggestion => (
                      <button
                        key={suggestion.job.id}
                        type="button"
                        onClick={() => setSelectedSuggestion(suggestion)}
                        className="w-full text-left depth-surface rounded-[1.25rem] border border-white/8 p-4 hover:border-primary/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{suggestion.job.normalized_data.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {suggestion.job.normalized_data.company} · {suggestion.job.normalized_data.location ?? 'Remote'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.reasons.join(' · ') || 'General profile fit'}
                            </p>
                          </div>
                          <Badge variant={suggestion.score >= 70 ? 'success' : suggestion.score >= 50 ? 'warning' : 'secondary'}>
                            {suggestion.score}% fit
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDiscoverJobs} disabled={discovering || resumes.length === 0}>
                  {discovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  {discovering ? 'Discovering...' : 'Discover Jobs'}
                </Button>
                {discoverResult && (
                  <p className="self-center text-sm text-muted-foreground">
                    Found {discoverResult.jobsFound} jobs, {discoverResult.jobsStored} stored
                  </p>
                )}
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

          {tab === 'resume' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Upload Resume</h1>
                <p className="text-muted-foreground mt-1">Upload your latest resume. If AI is unavailable, Applyo will store it and parse it later.</p>
              </div>
              <ResumeUploader
                onUploaded={r => {
                  setResumes(prev => [r, ...prev])
                  setQueueLoaded(false)
                  setResumeProfileData(r.parsed_data)
                  fetch('/api/preferences').then(res => res.ok ? res.json() : null).then(p => { if (p) setPreferences(p) }).catch(() => {})
                }}
                onDiscoveryComplete={(matchCount) => {
                  if (matchCount > 0) {
                    setQueueLoaded(false)
                    loadQueue(true)
                    setTab('queue')
                    toast(`Found ${matchCount} matching job${matchCount > 1 ? 's' : ''}! Review them below.`, 'success')
                  }
                }}
              />
              {resumes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your resumes</h2>
                  <div className="space-y-3">
                    {resumes.map((resume, i) => {
                      const resumeReady = !resume.processing_status || resume.processing_status === 'ready'
                      const description = resumeReady
                        ? `${resume.parsed_data.skills?.slice(0, 3).join(', ')} · ${resume.parsed_data.experience?.length ?? 0} roles`
                        : 'Stored safely. Parsing pending until AI is available.'

                      return (
                        <div key={resume.id} className="depth-surface rounded-[1.25rem] border border-white/8 p-4 flex items-center gap-4">
                          <FileText className="h-6 w-6 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {resumeReady ? resume.parsed_data.name : 'Resume uploaded'}
                            </p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                          {i === 0 && (
                            <Badge variant={resumeReady ? 'success' : 'warning'}>
                              {resumeReady ? 'Active' : 'Pending AI'}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'resume-profile' && candidate?.id && ( // New tab rendering
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Edit Resume Profile</h1>
                <p className="text-muted-foreground mt-1">Review and refine the information Applyo uses for matching and applications.</p>
              </div>
              <ResumeProfileForm
                candidateId={candidate.id}
                initialResumeData={resumeProfileData ?? undefined}
                onSaved={setResumeProfileData}
              />
            </div>
          )}

          {tab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Preferences</h1>
                <p className="text-muted-foreground mt-1">Tell Applyo what jobs to find and apply to on your behalf</p>
              </div>
              <PreferenceWizard initial={preferences ?? undefined} onSaved={setPreferences} />
            </div>
          )}

          {tab === 'queue' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Approval Queue</h1>
                  <p className="text-muted-foreground mt-1">Review AI-matched jobs before Applyo applies. You must approve each one.</p>
                </div>
                {queue.length > 1 && (
                  <Button
                    onClick={handleApproveAll}
                    disabled={approvingAll}
                    className="shrink-0"
                  >
                    {approvingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {approvingAll ? 'Approving...' : `Approve All (${queue.length})`}
                  </Button>
                )}
              </div>
              {queueLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="depth-surface rounded-[1.25rem] border border-white/8 p-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-56" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-6 w-16 rounded-md" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Skeleton className="h-9 flex-1 rounded-md" />
                        <Skeleton className="h-9 flex-1 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!queueLoading && queue.length === 0 && (
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
                  <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No jobs pending approval</p>
                  <p className="text-sm mt-1">Assisted apply jobs stay here for you to finish. Direct job posts can run automation when browser support is configured.</p>
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

          {tab === 'applications' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-muted-foreground mt-1">Track approved jobs, manual apply items, and confirmed automation submissions</p>
              </div>
              {appsLoading && (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              )}
              {!appsLoading && applications.length === 0 && (
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No applications yet</p>
                  <p className="text-sm mt-1">Approve direct job posts for automation, or use source links for manual search jobs.</p>
                </div>
              )}
              {!appsLoading && applications.length > 0 && (
                <div className="space-y-3">
                  {applications.map(app => (
                    <ApplicationRow
                      key={app.id}
                      application={app}
                      onUpdated={(updated) => {
                        setApplications(prev => prev.map(item => item.id === app.id ? { ...item, ...updated } : item))
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'chat' && <AIChatPanel />}
        </div>
      </main>

      <JobDetailModal
        job={selectedSuggestion?.job ?? null}
        score={selectedSuggestion?.score}
        reasons={selectedSuggestion?.reasons}
        open={!!selectedSuggestion}
        onOpenChange={(open) => { if (!open) setSelectedSuggestion(null) }}
        onAddedToQueue={() => { setQueueLoaded(false); loadQueue(true) }}
      />
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`depth-surface rounded-[1.25rem] border border-white/8 p-4 ${accent ? 'border-primary/30 bg-[linear-gradient(180deg,rgba(42,110,255,0.12),rgba(17,28,54,0.92))]' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function OnboardingStepper({ hasResume, hasPreferences, hasQueue, onNavigate }: {
  hasResume: boolean; hasPreferences: boolean; hasQueue: boolean; onNavigate: (tab: Tab) => void
}) {
  const steps = [
    { done: hasResume, label: 'Upload resume', tab: 'resume' as Tab },
    { done: hasPreferences, label: 'Review preferences', tab: 'preferences' as Tab },
    { done: hasQueue, label: 'Review & approve jobs', tab: 'queue' as Tab },
  ]
  const allDone = steps.every(s => s.done)
  if (allDone) return null

  const nextStep = steps.find(s => !s.done)

  return (
    <div className="depth-surface rounded-[1.25rem] border border-white/8 p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Getting started</p>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            )}
            <span className={`text-sm ${step.done ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>
              {step.label}
            </span>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-1" />}
          </div>
        ))}
      </div>
      {nextStep && (
        <Button size="sm" className="mt-3" onClick={() => onNavigate(nextStep.tab)}>
          {nextStep.label}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  )
}

function AIChatPanel() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user' as const, content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, mode: 'chat' }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages([...updated, { role: 'assistant', content: data.content }])
      } else {
        setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
      }
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">Ask about jobs, get cover letter drafts, or career advice</p>
      </div>
      <div className="depth-surface rounded-[1.25rem] border border-white/8 flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">Start a conversation — ask anything about your job search.</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-4 py-2 text-sm text-muted-foreground">Thinking...</div>
            </div>
          )}
        </div>
        <div className="border-t border-white/8 p-3 flex gap-2">
          <input
            className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ask about jobs, cover letters, interview tips..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          />
          <Button size="sm" onClick={send} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
