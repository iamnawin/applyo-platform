'use client'

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Preference } from '@/lib/types'
import { BasicPreferencesStep } from './preference-wizard/BasicPreferencesStep'
import { AdvancedPreferencesStep } from './preference-wizard/AdvancedPreferencesStep'
import { ReviewStep } from './preference-wizard/ReviewStep'

interface Props {
  initial?: Partial<Preference>
  onSaved: (prefs: Preference) => void
}

export function PreferenceWizard({ initial, onSaved }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<Preference>>(initial || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFormData = useCallback((data: Partial<Preference>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }, [])

  const steps = [
    {
      title: 'Basic Preferences',
      component: <BasicPreferencesStep initialData={formData} onUpdate={updateFormData} />,
    },
    {
      title: 'Advanced Preferences',
      component: <AdvancedPreferencesStep initialData={formData} onUpdate={updateFormData} />,
    },
    {
      title: 'Review & Confirm',
      component: <ReviewStep formData={formData} />,
    },
  ]

  const totalSteps = steps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save preferences')
        }
        const saved = await res.json()
        onSaved(saved)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setSaving(false)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preference Setup Wizard</CardTitle>
        <Progress value={progress} className="w-full mt-4" />
      </CardHeader>
      <CardContent>
        <h2 className="text-lg font-semibold mb-4">{steps[currentStep].title}</h2>
        {steps[currentStep].component}
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0 || saving}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {currentStep === totalSteps - 1 ? (saving ? 'Saving...' : 'Save & Finish') : 'Next'}
        </Button>
      </CardFooter>
    </Card>
  )
}
