# SKILL: Component Patterns
# File: .claude/skills/component-patterns.md
# Use this before working on: src/components/*, src/app/

---

## Stack

- **Next.js 14 App Router** — Server Components by default
- **TailwindCSS** — utility-first, mobile-first
- **shadcn/ui** — accessible primitives (do not rewrite these)
- **TypeScript strict** — no `any`, no untyped props

---

## Server vs Client — Decision Rule

| Needs | Use |
|---|---|
| Fetch DB data, no interactivity | Server Component (default) |
| useState, useEffect, onClick | `"use client"` Client Component |
| Realtime updates | Client Component + Supabase subscription |
| Form with submission | Server Action (Next.js) or Client Component |

Rule: Push `"use client"` as far DOWN the tree as possible.
Page-level components should almost always be Server Components.

---

## File Naming

```
PascalCase for components:    ResumeUploader.tsx
kebab-case for routes:        /app/(candidate)/approval-queue/page.tsx
camelCase for utilities:      parseResume.ts
UPPER_SNAKE for constants:    MAX_RESUME_SIZE_MB
```

---

## Component Template

```tsx
// src/components/candidate/ScoreCard.tsx
// NOTE: Every component file starts with a comment explaining what it does

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { MatchResult } from '@/types';

interface ScoreCardProps {
  match: MatchResult;
  className?: string;
}

export function ScoreCard({ match, className }: ScoreCardProps) {
  const scoreColor = match.overall_score >= 85 ? 'text-green-600'
    : match.overall_score >= 70 ? 'text-blue-600'
    : match.overall_score >= 55 ? 'text-amber-600'
    : 'text-red-500';

  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Match Score</span>
        <span className={cn('text-2xl font-bold', scoreColor)}>
          {match.overall_score}%
        </span>
      </div>

      <div className="space-y-2">
        {Object.entries(match.breakdown).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-32 text-xs text-muted-foreground capitalize">
              {key.replace('_', ' ')}
            </span>
            <Progress value={value} className="flex-1 h-1.5" />
            <span className="text-xs font-medium w-8 text-right">{value}%</span>
          </div>
        ))}
      </div>

      {match.missing_skills.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1.5">Missing skills</p>
          <div className="flex flex-wrap gap-1">
            {match.missing_skills.map(skill => (
              <Badge key={skill} variant="destructive" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Approval Queue Card Pattern

This is the most important UI component. Get it right.

```tsx
// src/components/candidate/ApprovalQueueCard.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, EyeOff, ExternalLink } from 'lucide-react';
import { ScoreCard } from './ScoreCard';
import type { MatchResult } from '@/types';

interface ApprovalQueueCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    platform: string;
    location: string;
    salary_display: string;
    jd_summary: string;
    source_url: string;
  };
  match: MatchResult;
  onApprove: (jobId: string) => Promise<void>;
  onSkip: (jobId: string) => void;
  onBlacklist: (company: string) => void;
}

export function ApprovalQueueCard({
  job, match, onApprove, onSkip, onBlacklist
}: ApprovalQueueCardProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleApprove() {
    setLoading(true);
    await onApprove(job.id);
    setLoading(false);
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className="text-xs">{job.platform}</Badge>
            <Badge variant="outline" className="text-xs">{job.location}</Badge>
            {job.salary_display && (
              <Badge variant="outline" className="text-xs">{job.salary_display}</Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold text-blue-600">{match.overall_score}%</span>
          <p className="text-xs text-muted-foreground">match</p>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t pt-3">
          <p className="text-sm text-muted-foreground">{job.jd_summary}</p>
          <ScoreCard match={match} />
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            View original JD <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-2">
        <Button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Check className="w-4 h-4 mr-1" />
          {loading ? 'Queuing...' : 'Approve'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSkip(job.id)}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'Details'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBlacklist(job.company)}
          className="text-muted-foreground"
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## Loading States

Always show loading. Never leave the user hanging.

```tsx
// Use for async actions
const [loading, setLoading] = useState(false);

// Use for page-level data
import { Skeleton } from '@/components/ui/skeleton';

function ResumeCardSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
```

---

## Error Handling in UI

```tsx
// Inline error (form fields)
{error && (
  <p className="text-sm text-destructive mt-1">{error}</p>
)}

// Toast for async actions
import { toast } from 'sonner';
toast.success('Application queued!');
toast.error('Failed to apply. Try again.');

// Error boundary for page sections (wrap in Suspense)
<Suspense fallback={<LoadingSkeleton />}>
  <AsyncComponent />
</Suspense>
```

---

## Responsive Grid Patterns

```tsx
// Approval queue — 1 col mobile, 2 col tablet, 3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

// Dashboard stats row
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

// Sidebar + main layout
<div className="flex flex-col lg:flex-row gap-6">
  <aside className="lg:w-64 shrink-0">...</aside>
  <main className="flex-1 min-w-0">...</main>
</div>
```

---

## Aplio Design Tokens

Use these Tailwind classes consistently:

| Element | Class |
|---|---|
| Primary action | `bg-blue-600 hover:bg-blue-700 text-white` |
| Approve action | `bg-green-600 hover:bg-green-700 text-white` |
| Danger / reject | `bg-red-500 hover:bg-red-600 text-white` |
| Card background | `bg-card border rounded-xl shadow-sm` |
| Muted label | `text-sm text-muted-foreground` |
| Section header | `text-lg font-semibold` |
| Score — excellent | `text-green-600` |
| Score — good | `text-blue-600` |
| Score — fair | `text-amber-600` |
| Score — poor | `text-red-500` |
