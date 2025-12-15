import { Progress } from '@/components/ui/progress';
import { ExternalLink, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useNavigate } from 'react-router-dom';

interface StrategicGoalsWidgetProps {
  snapshotId?: string;
}

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
      <PremiumCard className="h-full flex flex-col">
        <PremiumCardHeader title="Objectives" />
        <PremiumCardContent className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  const { count = 0, avgProgress = 0, objectives = [] } = metrics || {};
  const topObjectives = objectives.slice(0, 4);

  const headerAction = (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{avgProgress}%</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={handleOpenOKRHub}
        title="Open OKR Hub"
      >
        <ExternalLink className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
      </Button>
    </div>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Objectives" action={headerAction} />
      <PremiumCardContent className="flex-1">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
            >
              <Target className="w-4 h-4" style={{ color: 'hsl(var(--secondary-green))' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                {count} Objectives · {avgProgress}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>No objectives linked</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-sm" onClick={handleOpenOKRHub}>
              Open OKR Hub
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {topObjectives.map((obj) => (
              <div key={obj.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text-1)' }}>{obj.name}</span>
                  <span className="ml-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{Math.round(obj.overall_progress)}%</span>
                </div>
                <Progress 
                  value={obj.overall_progress} 
                  className="h-2"
                  style={{ '--progress-background': getHealthColor(obj.health) } as React.CSSProperties}
                />
              </div>
            ))}
            
            <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Overall ({count})</span>
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--brand-gold))' }}>{avgProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
