import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScoreBreakdown {
  skills: number
  experience: number
  location: number
  salary: number
}

interface Props {
  overall: number
  breakdown: ScoreBreakdown
}

export function ScoreCard({ overall, breakdown }: Props) {
  const color = overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-yellow-600' : 'text-red-500'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Match Score</CardTitle>
        <p className={`text-4xl font-bold ${color}`}>{overall}%</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="capitalize text-muted-foreground">{key}</span>
              <span className="font-medium">{val}%</span>
            </div>
            <Progress value={val} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
