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
        <PremiumCardHeader title="Objectives Progress" />
        <PremiumCardContent className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  const { count = 0, avgProgress = 0, objectives = [] } = metrics || {};
  const topObjectives = objectives.slice(0, 3);

  const headerAction = (
    <div className="flex items-center gap-1">
      <span className="text-[16px] font-bold" style={{ color: 'hsl(var(--brand-gold))' }}>{avgProgress}%</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleOpenOKRHub}
        title="Open OKR Hub"
      >
        <ExternalLink className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
      </Button>
    </div>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Objectives Progress" action={headerAction} />
      <PremiumCardContent className="flex-1 py-2">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-1.5">
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
            >
              <Target className="w-3.5 h-3.5" style={{ color: 'hsl(var(--secondary-green))' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
              {count} Objectives · {avgProgress}%
            </p>
            <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={handleOpenOKRHub}>
              Open OKR Hub
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {topObjectives.map((obj) => (
              <div key={obj.id} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium truncate flex-1" style={{ color: 'var(--text-1)' }}>{obj.name}</span>
                  <span className="ml-2 text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>{Math.round(obj.overall_progress)}%</span>
                </div>
                <Progress 
                  value={obj.overall_progress} 
                  className="h-1"
                  style={{ '--progress-background': getHealthColor(obj.health) } as React.CSSProperties}
                />
              </div>
            ))}
            
            <div className="pt-1.5 mt-1" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>Total ({count})</span>
                <span className="text-[14px] font-bold" style={{ color: 'hsl(var(--brand-gold))' }}>{avgProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
