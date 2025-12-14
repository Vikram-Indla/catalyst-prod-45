import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useNavigate } from 'react-router-dom';

interface StrategicGoalsWidgetProps {
  snapshotId?: string;
}

// Health color mapping
function getHealthColor(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'good': return 'hsl(var(--success))';
    case 'fair': return 'hsl(var(--warning))';
    case 'poor': return 'hsl(var(--destructive))';
    case 'at_risk': return 'hsl(var(--warning))';
    default: return 'hsl(var(--muted-foreground))';
  }
}

export function StrategicGoalsWidget({ snapshotId }: StrategicGoalsWidgetProps) {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useOKRv2StrategyMetrics(snapshotId);

  const handleOpenOKRHub = () => {
    navigate('/enterprise/okr-hub');
  };

  if (isLoading) {
    return (
      <Card style={{ borderLeft: '3px solid var(--accent-color)' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Strategic Objectives</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { count = 0, avgProgress = 0, objectives = [] } = metrics || {};
  const topObjectives = objectives.slice(0, 4);

  return (
    <Card style={{ borderLeft: '3px solid var(--accent-color)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Strategic Objectives</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="font-semibold">{avgProgress}%</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleOpenOKRHub}
              title="Open OKR Hub"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>No objectives linked to this snapshot's themes</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleOpenOKRHub}
            >
              Open OKR Hub
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {topObjectives.map((obj) => (
              <div key={obj.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1">{obj.name}</span>
                  <span className="text-muted-foreground ml-2">{Math.round(obj.overall_progress)}%</span>
                </div>
                <Progress 
                  value={obj.overall_progress} 
                  className="h-2"
                  style={{ 
                    '--progress-background': getHealthColor(obj.health) 
                  } as React.CSSProperties}
                />
              </div>
            ))}
            
            <div className="pt-3 mt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Overall Progress ({count} Objectives)</span>
                <span className="font-bold text-primary">{avgProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
