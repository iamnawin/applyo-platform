'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Preference } from '@/lib/types'

const WORK_AUTHORIZATION_OPTIONS = ['US Citizen', 'Green Card', 'H1B', 'Requires Sponsorship', 'Other'] as const

interface AdvancedPreferencesStepProps {
  initialData: Partial<Preference>
  onUpdate: (data: Partial<Preference>) => void
}

export function AdvancedPreferencesStep({ initialData, onUpdate }: AdvancedPreferencesStepProps) {
  const [targetCompanies, setTargetCompanies] = useState<string[]>(initialData.target_companies ?? [])
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>(initialData.preferred_industries ?? [])
  const [workAuthorization, setWorkAuthorization] = useState<string>(initialData.work_authorization ?? '')
  const [desiredSalaryCurrency, setDesiredSalaryCurrency] = useState<string>(initialData.desired_salary_currency ?? '')
  const [desiredJobTitles, setDesiredJobTitles] = useState<string[]>(initialData.desired_job_titles ?? [])

  const [targetCompanyInput, setTargetCompanyInput] = useState('')
  const [preferredIndustryInput, setPreferredIndustryInput] = useState('')
  const [desiredJobTitleInput, setDesiredJobTitleInput] = useState('')

  // Effect to call onUpdate whenever relevant state changes
  useEffect(() => {
    onUpdate({
      target_companies: targetCompanies,
      preferred_industries: preferredIndustries,
      work_authorization: workAuthorization || undefined,
      desired_salary_currency: desiredSalaryCurrency || undefined,
      desired_job_titles: desiredJobTitles,
    })
  }, [targetCompanies, preferredIndustries, workAuthorization, desiredSalaryCurrency, desiredJobTitles, onUpdate])

  function addTag(list: string[], setList: (v: string[]) => void, value: string) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed])
  }

  function removeTag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.filter(v => v !== value))
  }

  return (
    <div className="space-y-6">
      {/* Target Companies */}
      <div className="space-y-2">
        <Label>Target companies (companies you specifically want to work for)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Google, Microsoft"
            value={targetCompanyInput}
            onChange={e => setTargetCompanyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(targetCompanies, setTargetCompanies, targetCompanyInput); setTargetCompanyInput('') } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => { addTag(targetCompanies, setTargetCompanies, targetCompanyInput); setTargetCompanyInput('') }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {targetCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {targetCompanies.map(c => (
              <span key={c} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {c}
                <button type="button" onClick={() => removeTag(targetCompanies, setTargetCompanies, c)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Preferred Industries */}
      <div className="space-y-2">
        <Label>Preferred industries</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. FinTech, Healthcare"
            value={preferredIndustryInput}
            onChange={e => setPreferredIndustryInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(preferredIndustries, setPreferredIndustries, preferredIndustryInput); setPreferredIndustryInput('') } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => { addTag(preferredIndustries, setPreferredIndustries, preferredIndustryInput); setPreferredIndustryInput('') }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {preferredIndustries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {preferredIndustries.map(i => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                {i}
                <button type="button" onClick={() => removeTag(preferredIndustries, setPreferredIndustries, i)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Work Authorization */}
      <div className="space-y-2">
        <Label htmlFor="workAuthorization">Work Authorization</Label>
        <Select value={workAuthorization} onValueChange={setWorkAuthorization}>
          <SelectTrigger id="workAuthorization">
            <SelectValue placeholder="Select your work authorization" />
          </SelectTrigger>
          <SelectContent>
            {WORK_AUTHORIZATION_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desired Salary Currency */}
      <div className="space-y-2">
        <Label htmlFor="desiredSalaryCurrency">Desired Salary Currency</Label>
        <Input
          id="desiredSalaryCurrency"
          placeholder="e.g. USD, INR"
          value={desiredSalaryCurrency}
          onChange={e => setDesiredSalaryCurrency(e.target.value)}
        />
      </div>

      {/* Desired Job Titles */}
      <div className="space-y-2">
        <Label>Desired Job Titles (more specific than roles)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Senior Frontend Engineer, AI/ML Specialist"
            value={desiredJobTitleInput}
            onChange={e => setDesiredJobTitleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(desiredJobTitles, setDesiredJobTitles, desiredJobTitleInput); setDesiredJobTitleInput('') } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => { addTag(desiredJobTitles, setDesiredJobTitles, desiredJobTitleInput); setDesiredJobTitleInput('') }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {desiredJobTitles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {desiredJobTitles.map(t => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {t}
                <button type="button" onClick={() => removeTag(desiredJobTitles, setDesiredJobTitles, t)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
