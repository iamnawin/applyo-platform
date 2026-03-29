'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea' // Assuming a Textarea component exists or will be created
import type { ParsedResume } from '@/lib/types'

interface Props {
  candidateId: string
  initialResumeData?: ParsedResume
  onSaved?: (resume: ParsedResume) => void
}

export function ResumeProfileForm({ candidateId, initialResumeData, onSaved }: Props) {
  const [resumeData, setResumeData] = useState<ParsedResume>(
    initialResumeData || {
      name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
      languages: [],
    }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // If initialResumeData changes, update the state
  useEffect(() => {
    if (initialResumeData) {
      setResumeData(initialResumeData)
    }
  }, [initialResumeData])

  const handleChange = (field: keyof ParsedResume, value: any) => {
    setResumeData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof ParsedResume, index: number, subField: string, value: string) => {
    const updatedArray = [...(resumeData[field] as any[])]
    updatedArray[index] = { ...updatedArray[index], [subField]: value }
    setResumeData(prev => ({ ...prev, [field]: updatedArray }))
  }

  const addArrayItem = (field: keyof ParsedResume, newItem: any) => {
    setResumeData(prev => ({ ...prev, [field]: [...(prev[field] as any[]), newItem] }))
  }

  const removeArrayItem = (field: keyof ParsedResume, index: number) => {
    setResumeData(prev => ({ ...prev, [field]: (prev[field] as any[]).filter((_, i) => i !== index) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/candidate/${candidateId}/resume-profile`, {
        method: 'PUT', // Or POST, depending on API design
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Save failed')
      }
      const updatedResume = await res.json() as ParsedResume
      setSaved(true)
      onSaved?.(updatedResume)
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
        <CardTitle>Resume Profile</CardTitle>
        <CardDescription>Review and edit the information extracted from your resume.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={resumeData.name} onChange={e => handleChange('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={resumeData.email} onChange={e => handleChange('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={resumeData.phone} onChange={e => handleChange('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={resumeData.location} onChange={e => handleChange('location', e.target.value)} />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea id="summary" value={resumeData.summary} onChange={e => handleChange('summary', e.target.value)} rows={5} />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2">
              {resumeData.skills.map((skill, index) => (
                <span key={index} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {skill}
                  <button type="button" onClick={() => removeArrayItem('skills', index)}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <Input
                placeholder="Add skill"
                className="w-auto min-w-[120px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    addArrayItem('skills', e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-4">
            <Label>Experience</Label>
            {resumeData.experience.map((exp, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem('experience', index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`exp-title-${index}`}>Title</Label>
                    <Input id={`exp-title-${index}`} value={exp.title} onChange={e => handleArrayChange('experience', index, 'title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-company-${index}`}>Company</Label>
                    <Input id={`exp-company-${index}`} value={exp.company} onChange={e => handleArrayChange('experience', index, 'company', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-start-${index}`}>Start Date</Label>
                    <Input id={`exp-start-${index}`} value={exp.start} onChange={e => handleArrayChange('experience', index, 'start', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-end-${index}`}>End Date</Label>
                    <Input id={`exp-end-${index}`} value={exp.end} onChange={e => handleArrayChange('experience', index, 'end', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exp-description-${index}`}>Description</Label>
                  <Textarea id={`exp-description-${index}`} value={exp.description} onChange={e => handleArrayChange('experience', index, 'description', e.target.value)} rows={3} />
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => addArrayItem('experience', { title: '', company: '', start: '', end: '', description: '' })}>
              <Plus className="h-4 w-4 mr-2" /> Add Experience
            </Button>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <Label>Education</Label>
            {resumeData.education.map((edu, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem('education', index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`edu-degree-${index}`}>Degree</Label>
                    <Input id={`edu-degree-${index}`} value={edu.degree} onChange={e => handleArrayChange('education', index, 'degree', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edu-institution-${index}`}>Institution</Label>
                    <Input id={`edu-institution-${index}`} value={edu.institution} onChange={e => handleArrayChange('education', index, 'institution', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edu-year-${index}`}>Year</Label>
                    <Input id={`edu-year-${index}`} value={edu.year} onChange={e => handleArrayChange('education', index, 'year', e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => addArrayItem('education', { degree: '', institution: '', year: '' })}>
              <Plus className="h-4 w-4 mr-2" /> Add Education
            </Button>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label>Languages</Label>
            <div className="flex flex-wrap gap-2">
              {resumeData.languages.map((lang, index) => (
                <span key={index} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {lang}
                  <button type="button" onClick={() => removeArrayItem('languages', index)}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <Input
                placeholder="Add language"
                className="w-auto min-w-[120px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    addArrayItem('languages', e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : saved ? '✓ Saved' : 'Save Resume Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
