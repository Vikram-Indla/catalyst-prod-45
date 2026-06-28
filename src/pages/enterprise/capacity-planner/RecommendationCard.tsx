import { TrendingUp, Users, AlertTriangle, GanttChart } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiRecommendation } from './types';

export interface RecommendationCardProps {
  recommendation: AiRecommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const priorityColors = {
    high: 'border-l-[var(--ds-text-danger)]',
    medium: 'border-l-[var(--ds-text-warning)]',
    low: 'border-l-[var(--ds-chart-teal-bold)]',
  };

  const typeIcons = {
    rebalance: TrendingUp,
    hire: Users,
    alert: AlertTriangle,
    reassign: GanttChart,
  };

  const Icon = typeIcons[recommendation.type] || AlertTriangle;

  return (
    <div className={cn('bg-muted/50 border border-border rounded-lg p-4 border-l-4', priorityColors[recommendation.priority])}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1">{recommendation.title}</h4>
          <p className="text-xs text-muted-foreground">{recommendation.description}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs">Dismiss</Button>
            <Button size="sm" className="h-7 text-xs bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] hover:bg-[var(--ds-background-brand-bold-hovered)]">Apply</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
