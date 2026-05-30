import { Building2, MapPin, Clock, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  approved: 'Queued',
  applied: 'Applied',
  submitted: 'Applied',
  interview: 'Interview',
  rejected: 'Rejected',
  skipped: 'Skipped',
  failed: 'Failed to Apply',
  manual: 'Apply Manually',
  in_progress: 'Applying',
}

interface Props {
  application: Application & { job: Job }
}

export function ApplicationRow({ application }: Props) {
  const job = application.job
  const n = job.normalized_data
  const appliedAt = application.applied_at
    ? new Date(application.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null
  const displayStatus = application.automation_status && application.automation_status !== 'disabled'
    ? application.automation_status
    : application.status

  return (
    <div className="flex items-center gap-4 p-4 border border-white/8 rounded-xl depth-surface hover:border-primary/20 transition-colors">
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
            <a
              href={job.source_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary"
            >
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
  )
}
