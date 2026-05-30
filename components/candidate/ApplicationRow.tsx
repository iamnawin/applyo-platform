'use client'

import { useState } from 'react'
import { Building2, MapPin, Clock, ExternalLink, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getApplicationDisplayStatus } from '@/lib/automation/apply-eligibility'
import type { Application, Job } from '@/lib/types'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'warning',
  applied: 'success',
  submitted: 'success',
  interview: 'default',
  rejected: 'destructive',
  skipped: 'outline',
  failed: 'destructive',
  manual: 'outline',
  in_progress: 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Auto-apply Ready',
  applied: 'Applied',
  submitted: 'Submitted',
  interview: 'Interview',
  rejected: 'Rejected',
  skipped: 'Skipped',
  failed: 'Failed to Apply',
  manual: 'Needs Manual Apply',
  in_progress: 'Applying',
}

interface Props {
  application: Application & { job: Job }
  onUpdated?: (application: Partial<Application>) => void
}

export function ApplicationRow({ application, onUpdated }: Props) {
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatingContent, setGeneratingContent] = useState(false)
  const [markingApplied, setMarkingApplied] = useState(false)
  const [localStatus, setLocalStatus] = useState<Application['status'] | null>(null)

  const job = application.job
  const n = job.normalized_data
  const effectiveApplication = localStatus ? { ...application, status: localStatus } : application
  const appliedAt = application.applied_at
    ? new Date(application.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null
  const rawDisplayStatus = getApplicationDisplayStatus(effectiveApplication)
  const displayStatus = application.is_auto_apply_ready === false && application.manual_reason && rawDisplayStatus !== 'applied' && rawDisplayStatus !== 'submitted'
    ? 'manual'
    : rawDisplayStatus
  const isManualItem = displayStatus === 'manual' || displayStatus === 'failed'
  const logs = application.automation_logs ?? []

  async function handleGenerateContent() {
    setGeneratingContent(true)
    setGeneratedContent(null)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Write a concise cover letter for the role "${n.title}" at "${n.company}". Location: ${n.location ?? 'Remote'}. Skills needed: ${n.skills?.join(', ') ?? 'N/A'}.` }],
          mode: 'cover_letter',
          context: { candidateId: application.candidate_id, jobId: application.job_id },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success || !data.content) throw new Error(data.error || 'Failed to generate')
      setGeneratedContent(data.content)
    } catch {
      setGeneratedContent('Failed to generate content. Please try again.')
    } finally {
      setGeneratingContent(false)
    }
  }

  async function handleMarkApplied() {
    setMarkingApplied(true)
    try {
      const res = await fetch(`/api/applications/${application.id}/mark-applied`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to mark applied')
      setLocalStatus('applied')
      onUpdated?.({ ...data, status: 'applied' })
    } finally {
      setMarkingApplied(false)
    }
  }

  return (
    <div className="p-4 border border-white/8 rounded-xl depth-surface hover:border-primary/20 transition-colors space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{n.title ?? 'Job'}</p>
          <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {n.company ?? 'Company'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {n.location ?? 'Location'}
            </span>
            {appliedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appliedAt}
              </span>
            )}
            {job.source_url && (
              <a href={job.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary">
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {Math.round(application.match_score * 100)}% match
          </span>
          <Badge variant={STATUS_VARIANTS[displayStatus] ?? 'secondary'}>
            {STATUS_LABELS[displayStatus] ?? displayStatus}
          </Badge>
        </div>
      </div>

      {(application.manual_reason || logs.length > 0) && (displayStatus === 'manual' || displayStatus === 'failed') && (
        <div className="rounded-lg border border-white/8 bg-white/5 p-3 text-xs text-muted-foreground space-y-1">
          {application.manual_reason && <p>{application.manual_reason}</p>}
          {logs.slice(-2).map((entry, index) => (
            <p key={`${entry.timestamp}-${index}`}>{entry.message}</p>
          ))}
        </div>
      )}

      {isManualItem && (
        <div className="flex flex-wrap gap-2">
          {job.source_url && (
            <Button asChild size="sm" variant="outline">
              <a href={job.source_url} target="_blank" rel="noreferrer">
                Open Source <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleGenerateContent} disabled={generatingContent}>
            {generatingContent ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Generate Cover Letter
          </Button>
          <Button size="sm" onClick={handleMarkApplied} disabled={markingApplied}>
            {markingApplied ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            Mark Applied
          </Button>
        </div>
      )}

      {generatedContent && (
        <textarea
          className="w-full min-h-[180px] p-3 border border-white/8 rounded-lg text-sm text-foreground bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          value={generatedContent}
          onChange={(event) => setGeneratedContent(event.target.value)}
        />
      )}
    </div>
  )
}
