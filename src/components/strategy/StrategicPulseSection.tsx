/**
 * StrategicPulseSection — Signal-led KPI tiles
 * 5 equal tiles: Strategy Health, Progress, At Risk, Gaps, Open Risks
 * Uses keepPreviousData pattern to prevent blanking on snapshot switch
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
  ChevronRight,
  RefreshCw
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
    staleTime: 30000, // Keep data fresh for 30s
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
    'on-track': { label: 'On Track', bgClass: 'bg-status-success' },
    'at-risk': { label: 'At Risk', bgClass: 'bg-status-warning' },
    'off-track': { label: 'Off Track', bgClass: 'bg-status-danger' },
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
          <div className="h-3.5 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="p-3 rounded-md min-h-[88px]"
                style={{ 
                  backgroundColor: 'var(--muted)', 
                  border: '1px solid var(--border)',
                  borderLeft: '2px solid var(--border)'
                }}
              >
                <div className="h-2.5 w-16 rounded mb-2.5 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                <div className="h-6 w-12 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                <div className="h-2 w-20 rounded mb-2 animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                <div className="h-1 w-full rounded-full animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
              </div>
            ))}
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
          <div className="flex items-center gap-1.5">
            <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Refreshing…</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Tile 1: Strategy Health */}
          <KPITile
            label="Strategy Health"
            icon={<Activity size={13} />}
            accentColor="primary"
          >
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold",
                config.bgClass, "text-white"
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
              {displayData.overallStatus === 'on-track' ? 'Execution on track' : 
               displayData.overallStatus === 'at-risk' ? 'Needs attention' : 'Intervention needed'}
            </p>
          </KPITile>

          {/* Tile 2: Progress */}
          <KPITile
            label="Progress"
            icon={<BarChart3 size={13} />}
            onClick={() => navigate('/enterprise/okr-hub')}
            accentColor="primary"
          >
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span 
                className="text-xl font-bold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayData.objectivesCount > 0 ? `${displayData.overallProgress}%` : '—'}
              </span>
              {displayData.objectivesCount > 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-medium",
                  displayData.overallProgress >= 50 ? 'text-status-success' : 
                  displayData.overallProgress >= 30 ? '' : 'text-status-danger'
                )} style={displayData.overallProgress >= 30 && displayData.overallProgress < 50 ? { color: 'var(--text-muted)' } : {}}>
                  <TrendIcon size={10} />
                  {trendLabel}
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displayData.objectivesCount} objective{displayData.objectivesCount !== 1 ? 's' : ''}
            </p>
            {displayData.objectivesCount > 0 && (
              <div 
                className="w-full h-1 rounded-full mt-2 overflow-hidden"
                style={{ backgroundColor: 'var(--border-default)' }}
              >
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${displayData.overallProgress}%`,
                    backgroundColor: 'var(--brand-primary)'
                  }}
                />
              </div>
            )}
          </KPITile>

          {/* Tile 3: At Risk */}
          <KPITile
            label="At Risk"
            icon={<AlertTriangle size={13} />}
            onClick={() => navigate('/enterprise/okr-hub')}
            accentColor={displayData.atRiskCount > 0 ? 'warning' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums mt-0.5 inline-block",
              displayData.atRiskCount > 0 ? 'text-status-warning' : ''
            )} style={displayData.atRiskCount === 0 ? { color: 'var(--text-primary)' } : {}}>
              {displayData.atRiskCount}
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displayData.atRiskCount === 0 ? 'All healthy' : 'Need attention'}
            </p>
          </KPITile>

          {/* Tile 4: Gaps */}
          <KPITile
            label="Alignment Gaps"
            icon={<Target size={13} />}
            onClick={() => navigate('/enterprise/backlog')}
            accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums mt-0.5 inline-block",
              displayData.alignmentGaps > 0 ? 'text-secondary-bronze' : ''
            )} style={displayData.alignmentGaps === 0 ? { color: 'var(--text-primary)' } : {}}>
              {displayData.alignmentGaps}
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displayData.alignmentGaps === 0 ? 'Fully aligned' : 'Unlinked items'}
            </p>
          </KPITile>

          {/* Tile 5: Open Risks */}
          <KPITile
            label="Open Risks"
            icon={<Shield size={13} />}
            onClick={() => navigate('/enterprise/risks')}
            accentColor={displayData.highRisks > 0 ? 'danger' : 'muted'}
          >
            <span className={cn(
              "text-xl font-bold tabular-nums mt-0.5 inline-block",
              displayData.highRisks > 0 ? 'text-status-danger' : ''
            )} style={displayData.highRisks === 0 ? { color: 'var(--text-primary)' } : {}}>
              {displayData.openRisks}
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displayData.highRisks > 0 ? `${displayData.highRisks} high severity` : 'No critical'}
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

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "p-3 rounded-md text-left transition-all relative group min-h-[88px]",
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      )}
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `2px solid ${accentBorders[accentColor]}`,
      }}
      onMouseEnter={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-2)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
      } : undefined}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span 
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <span style={{ color: iconColors[accentColor] }}>{icon}</span>
      </div>
      
      {children}

      {onClick && (
        <ChevronRight 
          size={12} 
          className="absolute top-3 right-2.5 opacity-0 group-hover:opacity-40 transition-opacity" 
          style={{ color: 'var(--text-muted)' }}
        />
      )}
    </Wrapper>
  );
}
