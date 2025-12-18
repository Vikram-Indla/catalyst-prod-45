/**
 * StrategicPulseSection — Signal-led cockpit row
 * Hero: Strategy Health | Quiet metrics: Progress, At Risk, Gaps, Open Risks
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
  CheckCircle2,
  AlertCircle,
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
    'on-track': {
      label: 'On Track',
      icon: CheckCircle2,
      description: 'Strategy execution is proceeding as planned',
      accentClass: 'border-l-status-success',
      textClass: 'text-status-success',
      bgClass: 'bg-status-success/10',
    },
    'at-risk': {
      label: 'At Risk',
      icon: AlertCircle,
      description: 'Some objectives require attention',
      accentClass: 'border-l-status-warning',
      textClass: 'text-status-warning',
      bgClass: 'bg-status-warning/10',
    },
    'off-track': {
      label: 'Off Track',
      icon: AlertTriangle,
      description: 'Critical intervention needed',
      accentClass: 'border-l-status-danger',
      textClass: 'text-status-danger',
      bgClass: 'bg-status-danger/10',
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendClass = overallProgress >= 50 ? 'text-status-success' : overallProgress >= 30 ? 'text-muted-foreground' : 'text-status-danger';

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card">
        <div className="p-5 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Strategic Pulse</h2>
          <p className="text-[11px] text-muted-foreground">How healthy is the enterprise strategy?</p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Hero Card: Strategy Health */}
          <div 
            className={cn(
              "flex-shrink-0 lg:w-[240px] p-4 rounded-md border-l-[3px] transition-all",
              config.accentClass,
              config.bgClass
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("p-1.5 rounded", config.bgClass)}>
                <StatusIcon size={20} className={config.textClass} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("text-lg font-bold leading-tight", config.textClass)}>
                  {config.label}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {config.description}
                </p>
              </div>
            </div>
            
            {/* Progress with trend */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {hasObjectives ? `${overallProgress}%` : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5">progress</span>
              </div>
              {hasObjectives && (
                <div className={cn("flex items-center gap-1", trendClass)}>
                  <TrendIcon size={14} />
                  <span className="text-[10px] font-medium">
                    {overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quiet Metric Cards Grid */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <MetricCard
              label="Progress"
              value={hasObjectives ? `${overallProgress}%` : '—'}
              subtext={`${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''}`}
              icon={<BarChart3 size={14} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              showBar
              barValue={overallProgress}
            />
            
            <MetricCard
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={14} />}
              iconVariant={atRiskCount > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/enterprise/okr-hub')}
            />
            
            <MetricCard
              label="Gaps"
              value={alignmentGaps}
              subtext={alignmentGaps === 0 ? 'Fully aligned' : 'Unlinked items'}
              icon={<Target size={14} />}
              iconVariant={alignmentGaps > 0 ? 'bronze' : 'default'}
              onClick={() => navigate('/enterprise/backlog')}
            />
            
            <MetricCard
              label="Open Risks"
              value={openRisks}
              subtext={highRisks > 0 ? `${highRisks} high severity` : 'No critical'}
              icon={<Shield size={14} />}
              iconVariant={highRisks > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/enterprise/risks')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  iconVariant?: 'default' | 'warning' | 'danger' | 'bronze';
  onClick?: () => void;
  showBar?: boolean;
  barValue?: number;
}

function MetricCard({ 
  label, 
  value, 
  subtext, 
  icon, 
  iconVariant = 'default',
  onClick,
  showBar,
  barValue = 0,
}: MetricCardProps) {
  const iconColors = {
    default: 'text-muted-foreground',
    warning: 'text-status-warning',
    danger: 'text-status-danger',
    bronze: 'text-secondary-bronze',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-md text-left transition-all duration-150 group border-l-2 border-l-transparent",
        "bg-muted/30 hover:bg-muted/50 hover:border-l-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={iconColors[iconVariant]}>{icon}</span>
      </div>
      
      <span className="text-lg font-bold tabular-nums text-foreground block">
        {value}
      </span>
      
      <span className="text-[10px] text-muted-foreground block mt-0.5">
        {subtext}
      </span>

      {showBar && (
        <div className="w-full h-1 rounded-full mt-2 bg-border overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300 bg-primary"
            style={{ width: `${barValue}%` }}
          />
        </div>
      )}

      <ChevronRight 
        size={12} 
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground" 
      />
    </button>
  );
}
