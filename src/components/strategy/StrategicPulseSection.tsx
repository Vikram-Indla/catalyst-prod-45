/**
 * StrategicPulseSection — Signal-led KPI tiles
 * 5 equal tiles: Strategy Health, Progress, At Risk, Gaps, Open Risks
 */

import { useNavigate } from 'react-router-dom';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  AlertTriangle, 
  Target, 
  Shield,
  Activity,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrategicPulseSectionProps {
  snapshotId?: string;
}

type OverallStatus = 'on-track' | 'at-risk' | 'off-track';

export function StrategicPulseSection({ snapshotId }: StrategicPulseSectionProps) {
  const navigate = useNavigate();
  
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  const { data: riskData, isLoading: risksLoading } = useQuery({
    queryKey: ['strategic-pulse-risks', snapshotId],
    queryFn: async () => {
      const { data: risks } = await supabase
        .from('risks')
        .select('impact, status')
        .not('status', 'eq', 'Closed');

      const riskList = risks || [];
      const high = riskList.filter(r => {
        const impact = (r.impact || '').toLowerCase();
        return impact === 'critical' || impact === 'high' || impact === '5' || impact === '4';
      }).length;

      return { total: riskList.length, high };
    },
  });

  const isLoading = okrLoading || countsLoading || risksLoading;

  const objectivesCount = okrMetrics?.count ?? 0;
  const hasObjectives = objectivesCount > 0;
  const overallProgress = hasObjectives ? Math.round(okrMetrics?.avgProgress ?? 0) : 0;
  
  const atRiskCount = hasObjectives 
    ? (okrMetrics?.objectives?.filter(obj => {
        const health = (obj.health || '').toLowerCase();
        return health === 'at_risk' || health === 'poor';
      }).length ?? 0)
    : 0;

  const misalignedEpics = counts?.misalignedEpics ?? 0;
  const misalignedFeatures = counts?.misalignedFeatures ?? 0;
  const alignmentGaps = misalignedEpics + misalignedFeatures;

  const openRisks = riskData?.total ?? 0;
  const highRisks = riskData?.high ?? 0;

  const determineOverallStatus = (): OverallStatus => {
    if (!hasObjectives) return 'at-risk';
    if (highRisks > 2 || atRiskCount > 3 || overallProgress < 30) return 'off-track';
    if (highRisks > 0 || atRiskCount > 0 || alignmentGaps > 3 || overallProgress < 60) return 'at-risk';
    return 'on-track';
  };

  const overallStatus = determineOverallStatus();

  const statusConfig = {
    'on-track': { label: 'On Track', textClass: 'text-status-success', bgClass: 'bg-status-success' },
    'at-risk': { label: 'At Risk', textClass: 'text-status-warning', bgClass: 'bg-status-warning' },
    'off-track': { label: 'Off Track', textClass: 'text-status-danger', bgClass: 'bg-status-danger' },
  };

  const config = statusConfig[overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <div className="h-3.5 w-24 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/20 animate-pulse">
                <div className="h-2.5 w-16 bg-muted/40 rounded mb-2" />
                <div className="h-6 w-12 bg-muted/50 rounded mb-1.5" />
                <div className="h-2 w-20 bg-muted/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header - compact */}
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Strategic Pulse</h2>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Tile 1: Strategy Health */}
          <KPITile
            label="Strategy Health"
            icon={<Activity size={13} />}
            accentColor="primary"
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                config.bgClass, "text-white"
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
              {overallStatus === 'on-track' ? 'Execution on track' : 
               overallStatus === 'at-risk' ? 'Needs attention' : 'Intervention needed'}
            </p>
          </KPITile>

          {/* Tile 2: Progress */}
          <KPITile
            label="Progress"
            icon={<BarChart3 size={13} />}
            onClick={() => navigate('/enterprise/okr-hub')}
            accentColor="primary"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums text-foreground">
                {hasObjectives ? `${overallProgress}%` : '—'}
              </span>
              {hasObjectives && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-medium",
                  overallProgress >= 50 ? 'text-status-success' : 
                  overallProgress >= 30 ? 'text-muted-foreground' : 'text-status-danger'
                )}>
                  <TrendIcon size={10} />
                  {trendLabel}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {objectivesCount} objective{objectivesCount !== 1 ? 's' : ''}
            </p>
            {/* Micro progress bar */}
            {hasObjectives && (
              <div className="w-full h-1 rounded-full mt-2 bg-border overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            )}
          </KPITile>

          {/* Tile 3: At Risk */}
          <KPITile
            label="At Risk"
            icon={<AlertTriangle size={13} />}
            onClick={() => navigate('/enterprise/okr-hub')}
            accentColor={atRiskCount > 0 ? 'warning' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums",
              atRiskCount > 0 ? 'text-status-warning' : 'text-foreground'
            )}>
              {atRiskCount}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {atRiskCount === 0 ? 'All healthy' : 'Need attention'}
            </p>
          </KPITile>

          {/* Tile 4: Gaps */}
          <KPITile
            label="Alignment Gaps"
            icon={<Target size={13} />}
            onClick={() => navigate('/enterprise/backlog')}
            accentColor={alignmentGaps > 0 ? 'bronze' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums",
              alignmentGaps > 0 ? 'text-secondary-bronze' : 'text-foreground'
            )}>
              {alignmentGaps}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {alignmentGaps === 0 ? 'Fully aligned' : 'Unlinked items'}
            </p>
          </KPITile>

          {/* Tile 5: Open Risks */}
          <KPITile
            label="Open Risks"
            icon={<Shield size={13} />}
            onClick={() => navigate('/enterprise/risks')}
            accentColor={highRisks > 0 ? 'danger' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums",
              highRisks > 0 ? 'text-status-danger' : 'text-foreground'
            )}>
              {openRisks}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {highRisks > 0 ? `${highRisks} high severity` : 'No critical'}
            </p>
          </KPITile>
        </div>
      </div>
    </section>
  );
}

interface KPITileProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  accentColor?: 'primary' | 'warning' | 'danger' | 'bronze' | 'muted';
}

function KPITile({ label, icon, children, onClick, accentColor = 'muted' }: KPITileProps) {
  const accentBorders = {
    primary: 'border-l-primary',
    warning: 'border-l-status-warning',
    danger: 'border-l-status-danger',
    bronze: 'border-l-secondary-bronze',
    muted: 'border-l-border',
  };

  const iconColors = {
    primary: 'text-primary',
    warning: 'text-status-warning',
    danger: 'text-status-danger',
    bronze: 'text-secondary-bronze',
    muted: 'text-muted-foreground',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "p-3 rounded-md text-left transition-all border border-border bg-card relative group",
        "border-l-2",
        accentBorders[accentColor],
        onClick && [
          "hover:bg-muted/40 hover:border-border/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        ]
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={iconColors[accentColor]}>{icon}</span>
      </div>
      
      {children}

      {onClick && (
        <ChevronRight 
          size={12} 
          className="absolute top-3 right-2.5 opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground" 
        />
      )}
    </Wrapper>
  );
}
