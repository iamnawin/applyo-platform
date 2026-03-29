'use client'

import { useState, useCallback } from 'react'
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
      // This is the final step, trigger save
      // For now, just call onSaved with current formData
      onSaved(formData as Preference) // Cast as Preference, assuming all required fields are filled by now
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentStep === totalSteps - 1 ? 'Save & Finish' : 'Next'}
        </Button>
      </CardFooter>
    </Card>
  )
}
