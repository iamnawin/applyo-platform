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
import type { Resume, Candidate, Application, Job, Preference } from '@/lib/types'

interface Props {
  user: { id: string; email: string; name: string }
  candidate: Candidate | null
  initialResumes: Resume[]
  initialPreferences: Preference | null
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
type SuggestedJob = {
  job: Job
  score: number
  reasons: string[]
}

export function CandidateDashboardClient({ user, candidate, initialResumes, initialPreferences }: Props) {
  const router = useRouter()
  import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Settings, ListChecks, History, LogOut, Menu, X, Edit } from 'lucide-react' // Added Edit icon
import { createClient } from '@/lib/supabase/client'
import { ResumeUploader } from '@/components/candidate/ResumeUploader'
import { PreferenceForm } from '@/components/candidate/PreferenceForm'
import { ResumeProfileForm } from '@/components/candidate/ResumeProfileForm' // Added ResumeProfileForm import
import { ApprovalQueueCard } from '@/components/candidate/ApprovalQueueCard'
import { ApplicationRow } from '@/components/candidate/ApplicationRow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Resume, Candidate, Application, Job, Preference, ParsedResume } from '@/lib/types' // Added ParsedResume import

interface Props {
  user: { id: string; email: string; name: string }
  candidate: Candidate | null
  initialResumes: Resume[]
  initialPreferences: Preference | null
}

type Tab = 'overview' | 'resume' | 'resume-profile' | 'preferences' | 'queue' | 'applications' // Added 'resume-profile'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume', label: 'Upload Resume', icon: FileText }, // Changed label
  { id: 'resume-profile', label: 'Edit Resume Profile', icon: Edit }, // New tab
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'queue', label: 'Approval Queue', icon: ListChecks },
  { id: 'applications', label: 'Applications', icon: History },
] as const

type ApplicationWithJob = Application & { job: Job }
type SuggestedJob = {
  job: Job
  score: number
  reasons: string[]
}

export function CandidateDashboardClient({ user, candidate, initialResumes, initialPreferences }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [resumes, setResumes] = useState<Resume[]>(initialResumes)
  const [preferences, setPreferences] = useState<Preference | null>(initialPreferences)
  const [resumeProfileData, setResumeProfileData] = useState<ParsedResume | null>(null) // New state for resume profile
  const [mobileOpen, setMobileOpen] = useState(false)

  const [queue, setQueue] = useState<ApplicationWithJob[]>([])
  const [queueLoaded, setQueueLoaded] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [suggestedJobs, setSuggestedJobs] = useState<SuggestedJob[]>([])
  const [suggestedLoading, setSuggestedLoading] = useState(false)

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

  function handleQueueAction(id: string) {
    setQueue(prev => prev.filter(a => a.id !== id))
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const latestResume = resumes[0]
  const latestResumeSub = !latestResume
    ? 'Upload to get started'
    : latestResume.processing_status === 'ready'
      ? 'Parsed & ready'
      : 'Stored, parsing pending'

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
          <span className="font-semibold">Aplio</span>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-8">
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
                  sub={latestResumeSub}
                  accent={resumes.length > 0}
                />
                <StatCard
                  label="Preferences"
                  value={preferences ? 'Set' : 'Not set'}
                  sub={preferences ? 'Aplio is finding jobs' : 'Set your target roles'}
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
                    <p className="text-muted-foreground text-sm mt-0.5">Aplio will parse it and start finding matching jobs for you automatically</p>
                  </div>
                  <ResumeUploader onUploaded={r => {
                    setResumes([r])
                    setQueueLoaded(false)
                    setTab('queue')
                  }} />
                </div>
              )}

              {latestResume && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Latest resume</h2>
                  <div className="depth-surface rounded-[1.25rem] border border-white/8 p-4 flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {latestResume.processing_status === 'ready' ? latestResume.parsed_data.name : 'Resume uploaded'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {latestResume.processing_status === 'ready'
                          ? latestResume.parsed_data.skills?.slice(0, 4).join(', ')
                          : 'Stored safely. AI parsing is pending until provider credits are available.'}
                      </p>
                    </div>
                    <Badge variant={latestResume.processing_status === 'ready' ? 'success' : 'warning'}>
                      {latestResume.processing_status === 'ready' ? 'Active' : 'Pending AI'}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-base">Suggested jobs</p>
                  <p className="text-muted-foreground text-sm mt-0.5">Simple rule-based suggestions from stored jobs across sources.</p>
                </div>
                {suggestedLoading ? (
                  <div className="text-sm text-muted-foreground">Loading suggestions...</div>
                ) : suggestedJobs.length === 0 ? (
                  <div className="depth-surface rounded-[1.2rem] border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
                    No suggestions yet. Add job postings and preferences to start seeing matches.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestedJobs.slice(0, 4).map(suggestion => (
                      <div key={suggestion.job.id} className="depth-surface rounded-[1.25rem] border border-white/8 p-4">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

          {tab === 'resume' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Upload Resume</h1>
                <p className="text-muted-foreground mt-1">Upload your latest resume. If AI is unavailable, Aplio will store it and parse it later.</p>
              </div>
              <ResumeUploader onUploaded={r => {
                setResumes(prev => [r, ...prev])
                setQueueLoaded(false)
                setResumeProfileData(r.parsed_data) // Update resume profile data when new resume is uploaded
              }} />
              {resumes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your resumes</h2>
                  <div className="space-y-3">
                    {resumes.map((resume, i) => {
                      const description = resume.processing_status === 'ready'
                        ? `${resume.parsed_data.skills?.slice(0, 3).join(', ')} · ${resume.parsed_data.experience?.length ?? 0} roles`
                        : 'Stored safely. Parsing pending until AI is available.'

                      return (
                        <div key={resume.id} className="depth-surface rounded-[1.25rem] border border-white/8 p-4 flex items-center gap-4">
                          <FileText className="h-6 w-6 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {resume.processing_status === 'ready' ? resume.parsed_data.name : 'Resume uploaded'}
                            </p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                          {i === 0 && (
                            <Badge variant={resume.processing_status === 'ready' ? 'success' : 'warning'}>
                              {resume.processing_status === 'ready' ? 'Active' : 'Pending AI'}
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
                <p className="text-muted-foreground mt-1">Review and refine the information Aplio uses for matching and applications.</p>
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
                <p className="text-muted-foreground mt-1">Tell Aplio what jobs to find and apply to on your behalf</p>
              </div>
              <PreferenceForm initial={preferences ?? undefined} onSaved={setPreferences} />
            </div>
          )}

          {tab === 'queue' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Approval Queue</h1>
                <p className="text-muted-foreground mt-1">Review AI-matched jobs before Aplio applies. You must approve each one.</p>
              </div>
              {queueLoading && (
                <div className="text-center py-12 text-muted-foreground text-sm">Loading matches...</div>
              )}
              {!queueLoading && queue.length === 0 && (
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
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

          {tab === 'applications' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-muted-foreground mt-1">Track every job Aplio has applied to on your behalf</p>
              </div>
              {appsLoading && (
                <div className="text-center py-12 text-muted-foreground text-sm">Loading applications...</div>
              )}
              {!appsLoading && applications.length === 0 && (
                <div className="depth-surface rounded-[1.4rem] border border-dashed border-white/10 p-12 text-center text-muted-foreground">
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
    <div className={`depth-surface rounded-[1.25rem] border border-white/8 p-4 ${accent ? 'border-primary/30 bg-[linear-gradient(180deg,rgba(42,110,255,0.12),rgba(17,28,54,0.92))]' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}
