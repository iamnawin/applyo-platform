'use client'

import { useState } from 'react'
import { Building2, MapPin, Briefcase, ExternalLink, Check, X, Loader2, Sparkles, ChevronDown } from 'lucide-react' // Added Sparkles and ChevronDown
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ScoreCard } from './ScoreCard'
import { generateApplicationContent } from '@/lib/ai/generate-application-content' // Import AI function
import type { Application, Job, ParsedResume } from '@/lib/types' // Import ParsedResume

interface Props {
  application: Application & { job: Job }
  onAction: (id: string, action: 'approved' | 'skipped') => void
}

export function ApprovalQueueCard({ application, onAction }: Props) {
  const [loading, setLoading] = useState<'approved' | 'skipped' | null>(null)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatingContent, setGeneratingContent] = useState(false)
  const [showContentPreview, setShowContentPreview] = useState(false)

  const job = application.job
  const normalized = job.normalized_data

  async function handleAction(action: 'approved' | 'skipped') {
    setLoading(action)
    try {
      const body: { application_id: string; action: 'approved' | 'skipped'; generated_cover_letter?: string } = {
        application_id: application.id,
        action,
      }
      if (action === 'approved' && generatedContent) {
        body.generated_cover_letter = generatedContent
      }

      const res = await fetch(`/api/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Action failed')
      onAction(application.id, action)
    } catch {
      // show error in production
    } finally {
      setLoading(null)
    }
  }

  async function handleGenerateContent() {
    setGeneratingContent(true)
    setGeneratedContent(null)
    try {
      // Fetch candidate's parsed resume data
      const res = await fetch(`/api/candidate/${application.candidate_id}/resume-profile`)
      if (!res.ok) throw new Error('Failed to fetch resume profile.')
      const parsedResume: ParsedResume = await res.json()

      const content = await generateApplicationContent(
        parsedResume,
        normalized,
        'cover_letter'
      )
      setGeneratedContent(content)
      setShowContentPreview(true)
    } catch (err) {
      console.error('Error generating content:', err)
      setGeneratedContent('Failed to generate content. Please try again.')
    } finally {
      setGeneratingContent(false)
    }
  }

  const score = Math.round(application.match_score * 100)
  // Deterministic breakdown derived from overall score
  const breakdown = {
    skills: Math.min(100, Math.round(score * 1.05)),
    experience: Math.min(100, Math.round(score * 0.95)),
    location: Math.min(100, Math.round(score * 1.02)),
    salary: Math.min(100, Math.round(score * 0.98)),
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{normalized.title ?? 'Job Title'}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {normalized.company ?? 'Company'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {normalized.location ?? 'Location'}
              </span>
              {normalized.type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {normalized.type}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'secondary'}>
              {score}% match
            </Badge>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {normalized.salary_range && (
          <p className="mt-2 text-sm font-medium text-green-700">
            {normalized.salary_range.currency} {normalized.salary_range.min}–{normalized.salary_range.max} LPA
          </p>
        )}

        {normalized.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {normalized.skills.slice(0, 6).map((s: string) => (
              <span key={s} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{s}</span>
            ))}
            {normalized.skills.length > 6 && (
              <span className="text-xs text-muted-foreground">+{normalized.skills.length - 6} more</span>
            )}
          </div>
        )}

        {application.match_reasons && application.match_reasons.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Why this is a good match:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground/80">
              {application.match_reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <ScoreCard overall={score} breakdown={breakdown} />
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateContent}
            disabled={generatingContent}
            className="w-full"
          >
            {generatingContent ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generatingContent ? 'Generating...' : 'Generate Cover Letter'}
          </Button>

          {generatedContent && (
            <div className="mt-4 border rounded-lg">
              <button
                className="flex items-center justify-between w-full p-3 text-sm font-medium"
                onClick={() => setShowContentPreview(prev => !prev)}
              >
                <span>Cover Letter Preview</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showContentPreview ? 'rotate-180' : ''}`} />
              </button>
              {showContentPreview && (
                <div className="p-3 border-t text-sm text-muted-foreground whitespace-pre-wrap">
                  {generatedContent}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/30 px-6 py-4 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => handleAction('skipped')}
          disabled={loading !== null}
        >
          {loading === 'skipped' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
          Skip
        </Button>
        <Button
          className="flex-1"
          onClick={() => handleAction('approved')}
          disabled={loading !== null}
        >
          {loading === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
          Approve
        </Button>
      </CardFooter>
    </Card>
  )
}
