/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Unified design: 5 tiles feel like one cohesive system
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
 * 
 * Typography Lock Rules (Non-negotiable):
 * - Label: text-sm font-medium text-secondary
 * - Primary Value: text-2xl font-semibold text-primary (most dominant)
 * - Subtext: text-sm font-normal text-secondary
 * - NO text-muted, opacity-60, opacity-50 inside content
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
import { Skeleton } from '@/components/ui/skeleton';

interface StrategicPulseSectionProps {
  snapshotId?: string;
}

export function StrategicPulseSection({ snapshotId }: StrategicPulseSectionProps) {
  const navigate = useNavigate();
  
  const { data, isLoading, isFetching, hasData } = useStrategyRoomSummary(snapshotId);
  
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

  // Skeleton only on first load - matches final layout dimensions
  if (isLoading && !hasData) {
    return (
      <section 
        className="rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: 'var(--surface-bg)', 
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div 
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Primary card skeleton */}
            <div 
              className="lg:w-[220px] flex-shrink-0 p-4 rounded-md"
              style={{ 
                backgroundColor: 'var(--surface-2)', 
                border: '1px solid var(--border-subtle)',
                minHeight: '110px',
              }}
            >
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-20 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
            {/* Secondary cards skeleton */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['s1', 's2', 's3', 's4'].map((key) => (
                <div 
                  key={key}
                  className="p-3 rounded-md"
                  style={{ 
                    backgroundColor: 'var(--surface-2)', 
                    border: '1px solid var(--border-subtle)',
                    minHeight: '88px',
                  }}
                >
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-7 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-bg)', 
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Section Header */}
      <div 
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: 'var(--brand-primary)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Strategic Pulse
          </h2>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-secondary" />
            <span className="text-xs text-secondary">Refreshing…</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* PRIMARY CARD: Strategy Health */}
          <div 
            className="lg:w-[220px] flex-shrink-0 p-4 rounded-md flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderLeft: `4px solid ${displayData.overallStatus === 'on-track' ? 'var(--status-success)' : displayData.overallStatus === 'at-risk' ? 'var(--status-warning)' : 'var(--status-danger)'}`,
              minHeight: '110px',
            }}
          >
            <div>
              {/* Label: text-sm font-medium text-secondary */}
              <span className="text-sm font-medium text-secondary">
                Strategy Health
              </span>
              
              {/* Primary Value: Status badge is the dominant element */}
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded text-sm font-bold",
                  config.bgClass, "text-white"
                )}>
                  {config.label}
                </span>
              </div>
              
              {/* Subtext: text-sm font-normal text-secondary */}
              <p className="text-sm text-secondary mt-2">
                {displayData.overallStatus === 'on-track' 
                  ? 'Execution on track' 
                  : displayData.overallStatus === 'at-risk' 
                    ? 'Needs attention' 
                    : 'Intervention needed'}
              </p>
            </div>

            {/* Trend indicator */}
            <div 
              className="flex items-center gap-1.5 mt-3 pt-2" 
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <TrendIcon size={14} className={config.textClass} />
              <span className="text-sm font-medium text-secondary">
                {overallProgress}% · {trendLabel}
              </span>
            </div>
          </div>

          {/* SECONDARY CARDS: Metrics grid */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <CompactKPITile
              label="Progress"
              value={displayData.objectivesCount > 0 ? `${overallProgress}%` : '—'}
              subtext={`${displayData.objectivesCount} objectives`}
              icon={<BarChart3 size={16} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor="primary"
              showProgress={displayData.objectivesCount > 0}
              progressValue={overallProgress}
            />

            <CompactKPITile
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={16} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor={atRiskCount > 0 ? 'warning' : 'muted'}
              valueColor={atRiskCount > 0 ? 'var(--status-warning)' : undefined}
            />

            <CompactKPITile
              label="Gaps"
              value={displayData.alignmentGaps}
              subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
              icon={<Target size={16} />}
              onClick={() => navigate('/enterprise/backlog')}
              accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
              valueColor={displayData.alignmentGaps > 0 ? 'var(--secondary-bronze)' : undefined}
            />

            <CompactKPITile
              label="Risks"
              value={displayData.totalRisks}
              subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
              icon={<Shield size={16} />}
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
    muted: 'var(--border-subtle)',
  };

  const iconColors: Record<string, string> = {
    primary: 'var(--brand-primary)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    bronze: 'var(--secondary-bronze)',
    muted: 'var(--text-secondary)',
  };

  return (
    <button
      onClick={onClick}
      className="p-3 rounded-md text-left transition-all relative group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${accentBorders[accentColor]}`,
        minHeight: '88px',
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
      {/* Label row: text-sm font-medium text-secondary */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-secondary">
          {label}
        </span>
        <span style={{ color: iconColors[accentColor] }}>{icon}</span>
      </div>
      
      {/* Primary Value: text-2xl font-semibold text-primary - MOST DOMINANT */}
      <span 
        className="text-2xl font-semibold tabular-nums block leading-tight text-primary"
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </span>
      
      {/* Subtext: text-sm font-normal text-secondary */}
      <p className="text-sm text-secondary mt-0.5">
        {subtext}
      </p>

      {showProgress && (
        <div 
          className="w-full h-1 rounded-full mt-2 overflow-hidden"
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
        size={12} 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity text-secondary" 
      />
    </button>
  );
}
