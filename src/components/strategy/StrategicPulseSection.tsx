/**
 * StrategicPulseSection — Executive KPI cockpit
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
 * Uses stale-while-revalidate to prevent blanking on snapshot switch
 */

import { useRef } from 'react';
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
  
  // Store last valid data to prevent blanking
  const lastValidDataRef = useRef<{
    overallProgress: number;
    objectivesCount: number;
    atRiskCount: number;
    alignmentGaps: number;
    openRisks: number;
    highRisks: number;
    overallStatus: OverallStatus;
  } | null>(null);
  
  const { data: okrMetrics, isLoading: okrLoading, isFetching: okrFetching } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading, isFetching: countsFetching } = useStrategyPyramidCounts(snapshotId);

  const { data: riskData, isLoading: risksLoading, isFetching: risksFetching } = useQuery({
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
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const isInitialLoading = okrLoading || countsLoading || risksLoading;
  const isRefreshing = (okrFetching || countsFetching || risksFetching) && !isInitialLoading;

  // Compute current values
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

  // Update last valid data when we have real data
  if (!isInitialLoading) {
    lastValidDataRef.current = {
      overallProgress,
      objectivesCount,
      atRiskCount,
      alignmentGaps,
      openRisks,
      highRisks,
      overallStatus,
    };
  }

  // Use last valid data during initial load, or current data
  const displayData = isInitialLoading && lastValidDataRef.current 
    ? lastValidDataRef.current 
    : {
        overallProgress,
        objectivesCount,
        atRiskCount,
        alignmentGaps,
        openRisks,
        highRisks,
        overallStatus,
      };

  const statusConfig = {
    'on-track': { label: 'On Track', bgClass: 'bg-status-success', textClass: 'text-status-success' },
    'at-risk': { label: 'At Risk', bgClass: 'bg-status-warning', textClass: 'text-status-warning' },
    'off-track': { label: 'Off Track', bgClass: 'bg-status-danger', textClass: 'text-status-danger' },
  };

  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = displayData.overallProgress >= 50 ? TrendingUp : displayData.overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = displayData.overallProgress >= 50 ? 'Ahead' : displayData.overallProgress >= 30 ? 'On pace' : 'Behind';

  // Only show skeleton on true initial load with no cached data
  if (isInitialLoading && !lastValidDataRef.current) {
    return (
      <section 
        className="rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: 'var(--surface-bg)', 
          border: '1px solid var(--border-default)' 
        }}
      >
        <div 
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="h-3.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Primary skeleton */}
            <div 
              className="lg:w-[240px] min-h-[120px] p-4 rounded-md flex-shrink-0"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <div className="h-3 w-24 rounded mb-3 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
              <div className="h-7 w-20 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
              <div className="h-2.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
            </div>
            {/* Secondary skeletons */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="p-3 rounded-md min-h-[56px]"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <div className="h-2.5 w-14 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                  <div className="h-5 w-10 rounded mb-1 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                  <div className="h-2 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-bg)', 
        border: '1px solid var(--border-default)' 
      }}
    >
      {/* Section Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          Strategic Pulse
        </h2>
        {isRefreshing && (
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Refreshing…
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* PRIMARY CARD: Strategy Health */}
          <div 
            className="lg:w-[240px] flex-shrink-0 p-4 rounded-md"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderLeft: `3px solid ${displayData.overallStatus === 'on-track' ? 'var(--status-success)' : displayData.overallStatus === 'at-risk' ? 'var(--status-warning)' : 'var(--status-danger)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} style={{ color: 'var(--brand-primary)' }} />
              <span 
                className="text-[11px] font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Strategy Health
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold",
                config.bgClass, "text-white"
              )}>
                {config.label}
              </span>
            </div>
            
            <p 
              className="text-[11px] leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {displayData.overallStatus === 'on-track' 
                ? 'Execution progressing as planned' 
                : displayData.overallStatus === 'at-risk' 
                  ? 'Some objectives need attention' 
                  : 'Critical intervention required'}
            </p>

            {/* Trend indicator */}
            <div className="flex items-center gap-1.5 mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <TrendIcon size={12} className={config.textClass} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {displayData.overallProgress}% progress · {trendLabel}
              </span>
            </div>
          </div>

          {/* SECONDARY CARDS: Compact metrics */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Progress */}
            <CompactKPITile
              label="Progress"
              value={displayData.objectivesCount > 0 ? `${displayData.overallProgress}%` : '—'}
              subtext={`${displayData.objectivesCount} objective${displayData.objectivesCount !== 1 ? 's' : ''}`}
              icon={<BarChart3 size={12} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor="primary"
              showProgress={displayData.objectivesCount > 0}
              progressValue={displayData.overallProgress}
            />

            {/* At Risk */}
            <CompactKPITile
              label="At Risk"
              value={displayData.atRiskCount}
              subtext={displayData.atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={12} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor={displayData.atRiskCount > 0 ? 'warning' : 'muted'}
              valueColor={displayData.atRiskCount > 0 ? 'var(--status-warning)' : undefined}
            />

            {/* Alignment Gaps */}
            <CompactKPITile
              label="Alignment Gaps"
              value={displayData.alignmentGaps}
              subtext={displayData.alignmentGaps === 0 ? 'Fully aligned' : 'Unlinked items'}
              icon={<Target size={12} />}
              onClick={() => navigate('/enterprise/backlog')}
              accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
              valueColor={displayData.alignmentGaps > 0 ? 'var(--secondary-bronze)' : undefined}
            />

            {/* Open Risks */}
            <CompactKPITile
              label="Open Risks"
              value={displayData.openRisks}
              subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high severity` : 'No critical'}
              icon={<Shield size={12} />}
              onClick={() => navigate('/enterprise/risks')}
              accentColor={displayData.highRisks > 0 ? 'danger' : 'muted'}
              valueColor={displayData.highRisks > 0 ? 'var(--status-danger)' : undefined}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface CompactKPITileProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  onClick?: () => void;
  accentColor?: 'primary' | 'warning' | 'danger' | 'bronze' | 'muted';
  valueColor?: string;
  showProgress?: boolean;
  progressValue?: number;
}

function CompactKPITile({ 
  label, 
  value, 
  subtext, 
  icon, 
  onClick, 
  accentColor = 'muted',
  valueColor,
  showProgress,
  progressValue = 0
}: CompactKPITileProps) {
  const accentBorders: Record<string, string> = {
    primary: 'var(--brand-primary)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    bronze: 'var(--secondary-bronze)',
    muted: 'var(--border-default)',
  };

  const iconColors: Record<string, string> = {
    primary: 'var(--brand-primary)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    bronze: 'var(--secondary-bronze)',
    muted: 'var(--text-muted)',
  };

  return (
    <button
      onClick={onClick}
      className="p-2.5 rounded-md text-left transition-all relative group min-h-[56px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `2px solid ${accentBorders[accentColor]}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-2)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
      }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span 
          className="text-[10px] font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        <span style={{ color: iconColors[accentColor] }}>{icon}</span>
      </div>
      
      <span 
        className="text-lg font-bold tabular-nums block leading-tight"
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </span>
      
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {subtext}
      </p>

      {showProgress && (
        <div 
          className="w-full h-1 rounded-full mt-1.5 overflow-hidden"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${progressValue}%`,
              backgroundColor: 'var(--brand-primary)'
            }}
          />
        </div>
      )}

      <ChevronRight 
        size={10} 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity" 
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
}
