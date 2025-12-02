import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GaugeChart } from '../charts/GaugeChart';
import { HealthScoreBreakdown } from '@/types/reports.types';
import { Progress } from '@/components/ui/progress';

interface ProjectHealthScoreProps {
  healthScore: HealthScoreBreakdown;
}

export function ProjectHealthScore({ healthScore }: ProjectHealthScoreProps) {
  const breakdownItems = [
    { label: 'Coverage', score: healthScore.coverage.score, weight: healthScore.coverage.weight },
    { label: 'Automation', score: healthScore.automation.score, weight: healthScore.automation.weight },
    { label: 'Pass Rate', score: healthScore.passRate.score, weight: healthScore.passRate.weight },
    { label: 'Defect Resolution', score: healthScore.defectResolution.score, weight: healthScore.defectResolution.weight },
    { label: 'Activity', score: healthScore.activity.score, weight: healthScore.activity.weight },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Health Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <GaugeChart value={healthScore.overall} label="Overall Health" />
        <div className="w-full mt-6 space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{item.label} ({item.weight}%)</span>
                <span className="font-medium">{item.score}%</span>
              </div>
              <Progress value={item.score} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
