'use client'

import type { Preference } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReviewStepProps {
  formData: Partial<Preference>
}

export function ReviewStep({ formData }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review Your Preferences</h3>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Desired Roles:</strong> {formData.desired_roles?.join(', ') || 'N/A'}</p>
          <p><strong>Preferred Locations:</strong> {formData.preferred_locations?.join(', ') || 'N/A'}</p>
          <p><strong>Job Types:</strong> {formData.job_types?.join(', ') || 'N/A'}</p>
          <p><strong>Min Salary:</strong> {formData.min_salary ? `${formData.min_salary}` : 'N/A'}</p>
          <p><strong>Max Applications Per Day:</strong> {formData.max_applications_per_day || 'N/A'}</p>
          <p><strong>Blacklisted Companies:</strong> {formData.blacklisted_companies?.join(', ') || 'N/A'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advanced Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Target Companies:</strong> {formData.target_companies?.join(', ') || 'N/A'}</p>
          <p><strong>Preferred Industries:</strong> {formData.preferred_industries?.join(', ') || 'N/A'}</p>
          <p><strong>Work Authorization:</strong> {formData.work_authorization || 'N/A'}</p>
          <p><strong>Desired Salary Currency:</strong> {formData.desired_salary_currency || 'N/A'}</p>
          <p><strong>Desired Job Titles:</strong> {formData.desired_job_titles?.join(', ') || 'N/A'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
