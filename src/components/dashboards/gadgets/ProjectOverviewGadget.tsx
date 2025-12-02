import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectMetricsReport } from '@/hooks/useProjectMetrics';
import { FlaskConical, Layers, CalendarClock, Activity, Bug, Users, HardDrive, Cpu } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { GadgetConfig } from '@/types/dashboard.types';

interface ProjectOverviewGadgetProps {
  config: GadgetConfig;
}

export function ProjectOverviewGadget({ config }: ProjectOverviewGadgetProps) {
  const { data, isLoading } = useProjectMetricsReport({ programId: config.projectId });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 animate-pulse">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return <div className="p-4 text-muted-foreground">No data available</div>;

  const { overview, healthScore } = data;

  const metrics = [
    { label: 'Test Cases', value: overview.testCases, icon: FlaskConical, color: '#3b82f6' },
    { label: 'Cycles', value: overview.cycles, icon: CalendarClock, color: '#c69c6d' },
    { label: 'Automation', value: `${overview.automatedPercentage}%`, icon: Cpu, color: '#10b981', isProgress: true, progressValue: overview.automatedPercentage },
    { label: 'Pass Rate', value: `${healthScore.passRate.score}%`, icon: Activity, color: healthScore.passRate.score >= 80 ? '#10b981' : healthScore.passRate.score >= 60 ? '#eab308' : '#ef4444' },
    { label: 'Executions', value: overview.executions, icon: Layers, color: '#8b5cf6' },
    { label: 'Contributors', value: overview.contributors, icon: Users, color: '#06b6d4' },
    { label: 'Defects', value: overview.defects, icon: Bug, color: '#ef4444' },
    { label: 'Storage', value: `${Math.round(overview.storageUsed / 1024 / 1024)} MB`, icon: HardDrive, color: '#6b7280' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label} className="border-l-4" style={{ borderLeftColor: metric.color }}>
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{metric.label}</CardTitle>
              <Icon className="h-4 w-4" style={{ color: metric.color }} />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{metric.value}</div>
              {metric.isProgress && (
                <Progress value={metric.progressValue} className="h-1 mt-2" />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
