import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface WorkTreeDashboardProps {
  view: 'top-down' | 'bottom-up' | 'team';
  data: any;
  isLoading: boolean;
}

export function WorkTreeDashboard({ view, data, isLoading }: WorkTreeDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 4 progress donuts: Epic, Feature, Story, Task (NO Capability per hard guardrail)
  const metrics = [
    {
      label: 'Epic',
      total: data?.epicTotal || 0,
      completed: data?.epicCompleted || 0,
      progress: data?.epicTotal ? Math.round((data.epicCompleted / data.epicTotal) * 100) : 0
    },
    {
      label: 'Feature',
      total: data?.featureTotal || 0,
      completed: data?.featureCompleted || 0,
      progress: data?.featureTotal ? Math.round((data.featureCompleted / data.featureTotal) * 100) : 0
    },
    {
      label: 'Story',
      total: data?.storyTotal || 0,
      completed: data?.storyCompleted || 0,
      progress: data?.storyTotal ? Math.round((data.storyCompleted / data.storyTotal) * 100) : 0
    },
    {
      label: 'Task',
      total: data?.taskTotal || 0,
      completed: data?.taskCompleted || 0,
      progress: data?.taskTotal ? Math.round((data.taskCompleted / data.taskTotal) * 100) : 0
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="text-sm text-muted-foreground">
                {metric.completed} / {metric.total}
              </span>
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--brand-gold))"
                    strokeWidth="10"
                    strokeDasharray={`${metric.progress * 2.827} 282.7`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold">{metric.progress}%</span>
                </div>
              </div>
            </div>
            <Progress value={metric.progress} className="h-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
