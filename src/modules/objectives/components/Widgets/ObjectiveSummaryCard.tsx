import { Card } from '@/components/ui/card';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useObjectives } from '@/hooks/useObjectives';
import type { ObjectiveTier } from '../../types/objective.types';

interface ObjectiveSummaryCardProps {
  tier: ObjectiveTier;
  portfolioId?: string;
  programId?: string;
  teamId?: string;
  piId?: string;
}

export function ObjectiveSummaryCard({
  tier,
  portfolioId,
  programId,
  teamId,
  piId,
}: ObjectiveSummaryCardProps) {
  const filters: any = {
    tier: [tier],
    portfolioIds: portfolioId ? [portfolioId] : undefined,
    programIds: programId ? [programId] : undefined,
    teamIds: teamId ? [teamId] : undefined,
    piIds: piId ? [piId] : undefined,
  };

  const { data: objectivesData } = useObjectives(filters);
  const objectives = objectivesData?.flat || [];

  const onTrack = objectives.filter(obj => 
    obj.status === 'on_track' || obj.status === 'completed'
  ).length;

  const atRisk = objectives.filter(obj => 
    obj.status === 'at_risk'
  ).length;

  const offTrack = objectives.filter(obj => 
    obj.status === 'off_track' || obj.status === 'missed'
  ).length;

  const avgScore = objectives.length > 0
    ? objectives.reduce((sum, obj) => sum + (obj.score ?? 0), 0) / objectives.length
    : 0;

  const getScoreColor = () => {
    if (avgScore >= 0.7) return 'text-success';
    if (avgScore >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="p-[var(--s6)]">
      <div className="flex items-center gap-[var(--s2)] mb-[var(--s4)]">
        <Target className="h-5 w-5 text-brand-gold" />
        <h3 className="font-semibold">Objectives Summary</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--s4)]">
        <div className="text-center">
          <div className="text-2xl font-bold mb-1">{objectives.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div className="text-2xl font-bold text-success">{onTrack}</div>
          </div>
          <div className="text-xs text-muted-foreground">On Track</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-4 w-4 text-warning" />
            <div className="text-2xl font-bold text-warning">{atRisk}</div>
          </div>
          <div className="text-xs text-muted-foreground">At Risk</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div className="text-2xl font-bold text-destructive">{offTrack}</div>
          </div>
          <div className="text-xs text-muted-foreground">Off Track</div>
        </div>
      </div>

      <div className="mt-[var(--s6)] pt-[var(--s4)] border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Average Score</span>
          <span className={`text-2xl font-bold ${getScoreColor()}`}>
            {(avgScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
