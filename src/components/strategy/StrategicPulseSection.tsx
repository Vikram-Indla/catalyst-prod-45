/**
 * StrategicPulseSection — Executive KPI cockpit
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
 * 
 * KEY BEHAVIOR: Never blanks out once data is loaded.
 * - Skeleton only on first-ever load
 * - "Updating..." indicator during refetch
 * - Last good data persists across snapshot switches
 */

import { useNavigate } from 'react-router-dom';
import { useStrategyRoomSummary, EMPTY_SUMMARY } from '@/hooks/useStrategyRoomSummary';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrategicPulseSectionProps {
  snapshotId?: string;
}

export function StrategicPulseSection({ snapshotId }: StrategicPulseSectionProps) {
  const navigate = useNavigate();
  
  const { data, isLoading, isFetching, hasData } = useStrategyRoomSummary(snapshotId);
  
  // Use data or safe defaults (NEVER undefined in render)
  const displayData = data ?? EMPTY_SUMMARY;

  const atRiskCount = displayData.atRiskObjectives?.length ?? 0;
  const overallProgress = displayData.avgProgress;

  const statusConfig = {
    'on-track': { label: 'On Track', bgClass: 'bg-status-success', textClass: 'text-status-success' },
    'at-risk': { label: 'At Risk', bgClass: 'bg-status-warning', textClass: 'text-status-warning' },
    'off-track': { label: 'Off Track', bgClass: 'bg-status-danger', textClass: 'text-status-danger' },
  };

  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';

  // Show skeleton ONLY on true first load (never had any data)
  if (isLoading && !hasData) {
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
            {/* Secondary skeletons - stable keys */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'].map((key) => (
                <div 
                  key={key}
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

  // Determine if we're updating (but have data to show)
  const isUpdating = isFetching && hasData;

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
        {isUpdating && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Updating…
            </span>
          </div>
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
                {overallProgress}% progress · {trendLabel}
              </span>
            </div>
          </div>

          {/* SECONDARY CARDS: Compact metrics - STABLE KEYS */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Progress */}
            <CompactKPITile
              label="Progress"
              value={displayData.objectivesCount > 0 ? `${overallProgress}%` : '—'}
              subtext={`${displayData.objectivesCount} objective${displayData.objectivesCount !== 1 ? 's' : ''}`}
              icon={<BarChart3 size={12} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor="primary"
              showProgress={displayData.objectivesCount > 0}
              progressValue={overallProgress}
            />

            {/* At Risk */}
            <CompactKPITile
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={12} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor={atRiskCount > 0 ? 'warning' : 'muted'}
              valueColor={atRiskCount > 0 ? 'var(--status-warning)' : undefined}
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
              value={displayData.totalRisks}
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
