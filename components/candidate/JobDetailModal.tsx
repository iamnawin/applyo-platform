'use client'

import { useState } from 'react'
import { Loader2, Plus, MapPin, Briefcase, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Job } from '@/lib/types'

interface Props {
  job: Job | null
  score?: number
  reasons?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddedToQueue?: () => void
}

export function JobDetailModal({ job, score, reasons, open, onOpenChange, onAddedToQueue }: Props) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!job) return null

  const nd = job.normalized_data

  async function handleAddToQueue() {
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job!.id,
          match_score: score == null ? undefined : score / 100,
          match_reasons: reasons ?? undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add to queue')
      }
      setAdded(true)
      onAddedToQueue?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setAdded(false); setError(null) } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nd.title}</DialogTitle>
          <DialogDescription>{nd.company}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {nd.location && (
              <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{nd.location}</Badge>
            )}
            {nd.type && (
              <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1" />{nd.type}</Badge>
            )}
            {nd.salary_range && (
              <Badge variant="secondary">
                <DollarSign className="h-3 w-3 mr-1" />
                {nd.salary_range.min}–{nd.salary_range.max} {nd.salary_range.currency}
              </Badge>
            )}
            {nd.experience_years != null && (
              <Badge variant="secondary">{nd.experience_years}+ yrs exp</Badge>
            )}
          </div>

          {score != null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Match:</span>
              <Badge variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'secondary'}>{score}% fit</Badge>
            </div>
          )}

          {nd.skills.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Skills</p>
              <div className="flex flex-wrap gap-1">
                {nd.skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          )}

          {nd.description_summary && (
            <div>
              <p className="text-sm font-medium mb-1">Summary</p>
              <p className="text-sm text-muted-foreground">{nd.description_summary}</p>
            </div>
          )}

          {reasons && reasons.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Why this matches</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                {reasons.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}

          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              View original posting →
            </a>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            {added ? (
              <Button disabled className="flex-1 bg-green-600">✓ Added to Queue</Button>
            ) : (
              <Button onClick={handleAddToQueue} disabled={adding} className="flex-1">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {adding ? 'Adding...' : 'Add to Queue'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
