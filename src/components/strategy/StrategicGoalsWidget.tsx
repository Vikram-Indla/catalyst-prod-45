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
    <Card 
      className="rounded-lg shadow-sm"
      style={{ 
        borderLeft: '2px solid var(--accent-color)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader className="py-2 px-3" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
            Objectives</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--accent-color)' }}>{avgProgress}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={handleOpenOKRHub}
              title="Open OKR Hub"
            >
              <ExternalLink className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {count === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>No objectives linked</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleOpenOKRHub}>
              Open OKR Hub
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {topObjectives.map((obj) => (
              <div key={obj.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1" style={{ color: 'var(--text-1)' }}>{obj.name}</span>
                  <span className="ml-2" style={{ color: 'var(--text-3)' }}>{Math.round(obj.overall_progress)}%</span>
                </div>
                <Progress 
                  value={obj.overall_progress} 
                  className="h-1.5"
                  style={{ '--progress-background': getHealthColor(obj.health) } as React.CSSProperties}
                />
              </div>
            ))}
            
            <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium" style={{ color: 'var(--text-2)' }}>Overall ({count})</span>
                <span className="font-bold" style={{ color: 'var(--accent-color)' }}>{avgProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
