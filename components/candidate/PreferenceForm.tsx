'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Preference } from '@/lib/types'

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'remote'] as const

interface Props {
  initial?: Partial<Preference>
  onSaved: (prefs: Preference) => void
}

export function PreferenceForm({ initial, onSaved }: Props) {
  const [roles, setRoles] = useState<string[]>(initial?.desired_roles ?? [])
  const [locations, setLocations] = useState<string[]>(initial?.preferred_locations ?? [])
  const [jobTypes, setJobTypes] = useState<string[]>(initial?.job_types ?? [])
  const [minSalary, setMinSalary] = useState(initial?.min_salary?.toString() ?? '')
  const [maxPerDay, setMaxPerDay] = useState((initial?.max_applications_per_day ?? 10).toString())
  const [blacklisted, setBlacklisted] = useState<string[]>(initial?.blacklisted_companies ?? [])
  const [notify, setNotify] = useState(initial?.notify_on_match ?? true)

  const [roleInput, setRoleInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [blacklistInput, setBlacklistInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function addTag(list: string[], setList: (v: string[]) => void, value: string) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed])
  }

  function removeTag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.filter(v => v !== value))
  }

  function toggleJobType(type: string) {
    setJobTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body = {
      desired_roles: roles,
      preferred_locations: locations,
      job_types: jobTypes,
      min_salary: minSalary ? parseFloat(minSalary) : undefined,
      max_applications_per_day: parseInt(maxPerDay) || 10,
      blacklisted_companies: blacklisted,
      notify_on_match: notify,
    }

    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Save failed')
      }
      const savedPreferences = await res.json() as Preference
      setSaved(true)
      onSaved(savedPreferences)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Preferences</CardTitle>
        <CardDescription>Tell Aplio what jobs to find for you</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Desired roles */}
          <div className="space-y-2">
            <Label>Desired roles</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Software Engineer"
                value={roleInput}
                onChange={e => setRoleInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(roles, setRoles, roleInput); setRoleInput('') } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => { addTag(roles, setRoles, roleInput); setRoleInput('') }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map(r => (
                  <span key={r} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {r}
                    <button type="button" onClick={() => removeTag(roles, setRoles, r)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label>Preferred locations</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Bangalore, Remote"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(locations, setLocations, locationInput); setLocationInput('') } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => { addTag(locations, setLocations, locationInput); setLocationInput('') }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {locations.map(l => (
                  <span key={l} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {l}
                    <button type="button" onClick={() => removeTag(locations, setLocations, l)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Job types */}
          <div className="space-y-2">
            <Label>Job types</Label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleJobType(type)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors capitalize ${
                    jobTypes.includes(type)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Salary + daily limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minSalary">Min. salary (₹ LPA)</Label>
              <Input
                id="minSalary"
                type="number"
                placeholder="e.g. 10"
                value={minSalary}
                onChange={e => setMinSalary(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPerDay">Max applications / day</Label>
              <Input
                id="maxPerDay"
                type="number"
                value={maxPerDay}
                onChange={e => setMaxPerDay(e.target.value)}
                min={1}
                max={50}
              />
            </div>
          </div>

          {/* Blacklisted companies */}
          <div className="space-y-2">
            <Label>Blacklisted companies (never apply)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. CompanyName"
                value={blacklistInput}
                onChange={e => setBlacklistInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(blacklisted, setBlacklisted, blacklistInput); setBlacklistInput('') } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => { addTag(blacklisted, setBlacklisted, blacklistInput); setBlacklistInput('') }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {blacklisted.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {blacklisted.map(c => (
                  <span key={c} className="flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-medium">
                    {c}
                    <button type="button" onClick={() => removeTag(blacklisted, setBlacklisted, c)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Match notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when new jobs match your profile</p>
            </div>
            <button
              type="button"
              onClick={() => setNotify(n => !n)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notify ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${notify ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : saved ? '✓ Saved' : 'Save preferences'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
