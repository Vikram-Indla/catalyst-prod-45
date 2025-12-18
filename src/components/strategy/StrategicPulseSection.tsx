/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Unified design: 5 tiles feel like one cohesive system
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
 * 
 * TYPOGRAPHY LOCK (JOB-190):
 * - Section title: text-sm font-semibold tracking-wide (14px min)
 * - Card label: text-sm font-medium (14px min)
 * - Primary value: text-3xl font-semibold (30px) - MOST DOMINANT
 * - Subtext: text-sm text-secondary (readable, NO opacity stacking)
 * - NO text-muted, opacity-60, opacity-50 on content
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
import { TYPOGRAPHY, TEXT_CLASSES } from './strategyRoomTypography';

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
                minHeight: '120px',
              }}
            >
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
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
                    minHeight: '100px',
                  }}
                >
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-14 mb-1" />
                  <Skeleton className="h-4 w-24" />
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
      {/* Section Header - text-sm font-semibold tracking-wide */}
      <div 
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: 'var(--brand-primary)' }} />
          <h2 className={cn(TYPOGRAPHY.sectionTitle, TEXT_CLASSES.secondary)}>
            Strategic Pulse
          </h2>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Refreshing…</span>
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
              minHeight: '120px',
            }}
          >
            <div>
              {/* Label: text-sm font-medium text-secondary */}
              <span className={cn(TYPOGRAPHY.cardLabel, TEXT_CLASSES.secondary)}>
                Strategy Health
              </span>
              
              {/* Primary Value: Status badge is the dominant element */}
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded text-base font-bold",
                  config.bgClass, "text-white"
                )}>
                  {config.label}
                </span>
              </div>
              
              {/* Subtext: text-sm text-secondary (readable) */}
              <p className={cn(TYPOGRAPHY.subtext, TEXT_CLASSES.secondary, 'mt-2')}>
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
              <TrendIcon size={16} className={config.textClass} />
              <span className={cn(TYPOGRAPHY.subtext, 'font-medium')} style={{ color: 'var(--text-secondary)' }}>
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
              icon={<BarChart3 size={18} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor="primary"
              showProgress={displayData.objectivesCount > 0}
              progressValue={overallProgress}
            />

            <CompactKPITile
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={18} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor={atRiskCount > 0 ? 'warning' : 'muted'}
              valueColor={atRiskCount > 0 ? 'var(--status-warning)' : undefined}
            />

            <CompactKPITile
              label="Gaps"
              value={displayData.alignmentGaps}
              subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
              icon={<Target size={18} />}
              onClick={() => navigate('/enterprise/backlog')}
              accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
              valueColor={displayData.alignmentGaps > 0 ? 'var(--secondary-bronze)' : undefined}
            />

            <CompactKPITile
              label="Risks"
              value={displayData.totalRisks}
              subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
              icon={<Shield size={18} />}
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
        minHeight: '100px',
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
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(TYPOGRAPHY.cardLabel, TEXT_CLASSES.secondary)}>
          {label}
        </span>
        <span style={{ color: iconColors[accentColor] }}>{icon}</span>
      </div>
      
      {/* Primary Value: text-3xl font-semibold - MOST DOMINANT */}
      <span 
        className={cn(TYPOGRAPHY.primaryMetric, 'block', TEXT_CLASSES.primary)}
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </span>
      
      {/* Subtext: text-sm text-secondary (readable) */}
      <p className={cn(TYPOGRAPHY.subtext, TEXT_CLASSES.secondary, 'mt-1')}>
        {subtext}
      </p>

      {showProgress && (
        <div 
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
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
        size={14} 
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition-opacity" 
        style={{ color: 'var(--text-secondary)' }}
      />
    </button>
  );
}
