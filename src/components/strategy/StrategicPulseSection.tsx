/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Unified design: 5 tiles feel like one cohesive system
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
 * 
 * TYPOGRAPHY LOCK (CIO COCKPIT UX — NON-NEGOTIABLE):
 * ─────────────────────────────────────────────────
 * KPI VALUE:
 *   - Font size: 30px (desktop)
 *   - Font weight: 600-700
 *   - Line height: 1.15
 *   - Color: primary text (NEVER muted, NEVER greyed)
 *   - ⚠️ MUST NEVER become smaller during refresh
 * 
 * KPI LABEL:
 *   - Font size: 14px
 *   - Font weight: 500
 *   - Color: secondary text token
 * 
 * KPI SUBTEXT:
 *   - Font size: 13px
 *   - Font weight: 400
 *   - Color: muted text token
 *   - ⚠️ MUST remain visible during refresh
 * 
 * STATUS TEXT (e.g., "Off Track"):
 *   - Font size: 15px
 *   - Font weight: 600
 *   - Color: semantic (risk/warning/success)
 *   - ⚠️ MUST NEVER fade or shrink
 * 
 * LOADING BEHAVIOR:
 *   - Skeleton allowed ONCE on initial load only
 *   - After first success: NEVER show skeleton again
 *   - During refresh: show "Refreshing…" in header, keep content visible
 *   - NO greying, NO opacity reduction, NO layout shift
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
import { TYPOGRAPHY, TEXT_COLORS } from './strategyRoomTypography';

interface StrategicPulseSectionProps {
  snapshotId?: string;
}

export function StrategicPulseSection({ snapshotId }: StrategicPulseSectionProps) {
  const navigate = useNavigate();
  
  const { data, isLoading, isFetching, hasData, isStale, error } = useStrategyRoomSummary(snapshotId);
  
  const displayData = data ?? EMPTY_SUMMARY;
  
  // Show stale indicator if we're showing cached data after an error or stale fetch
  const showStaleIndicator = isStale && !isFetching && !!error;

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
        className="rounded-lg overflow-hidden bg-card border border-border"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="px-4 py-2.5 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Primary card skeleton */}
            <div className="lg:w-[220px] flex-shrink-0 p-4 rounded-md bg-muted border border-border/50 min-h-[120px]">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Secondary cards skeleton */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['s1', 's2', 's3', 's4'].map((key) => (
                <div key={key} className="p-3 rounded-md bg-muted border border-border/50 min-h-[100px]">
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
      className="rounded-lg overflow-hidden bg-card border border-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Section Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <h2 className={cn(TYPOGRAPHY.sectionTitle, TEXT_COLORS.muted)}>
            Strategic Pulse
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Stale data indicator - subtle, non-intrusive */}
          {showStaleIndicator && (
            <span className="text-[11px] text-muted-foreground/70 italic">
              Data may be stale
            </span>
          )}
          {/* Refreshing indicator - small spinner only */}
          {isUpdating && (
            <div className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
              <span className={cn(TYPOGRAPHY.subtext, TEXT_COLORS.muted)}>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* PRIMARY CARD: Strategy Health */}
          <div 
            className="lg:w-[220px] flex-shrink-0 p-4 rounded-md flex flex-col justify-between bg-muted/50 border border-border/50"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: displayData.overallStatus === 'on-track' 
                ? 'var(--status-success)' 
                : displayData.overallStatus === 'at-risk' 
                  ? 'var(--status-warning)' 
                  : 'var(--status-danger)',
              minHeight: '120px',
            }}
          >
            <div>
              {/* Label */}
              <span className={cn(TYPOGRAPHY.cardLabel, TEXT_COLORS.muted)}>
                Strategy Health
              </span>
              
              {/* Primary Value: Status badge */}
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded font-bold",
                  TYPOGRAPHY.primaryMetricStatus,
                  config.bgClass,
                  "text-white"
                )}>
                  {config.label}
                </span>
              </div>
              
              {/* Subtext */}
              <p className={cn(TYPOGRAPHY.subtext, TEXT_COLORS.muted, 'mt-2')}>
                {displayData.overallStatus === 'on-track' 
                  ? 'Execution on track' 
                  : displayData.overallStatus === 'at-risk' 
                    ? 'Needs attention' 
                    : 'Intervention needed'}
              </p>
            </div>

            {/* Trend indicator */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/50">
              <TrendIcon size={16} className={config.textClass} />
              <span className={cn(TYPOGRAPHY.subtext, 'font-medium', TEXT_COLORS.muted)}>
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
              valueColor={atRiskCount > 0 ? 'text-status-warning' : undefined}
            />

            <CompactKPITile
              label="Gaps"
              value={displayData.alignmentGaps}
              subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
              icon={<Target size={18} />}
              onClick={() => navigate('/enterprise/backlog')}
              accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
              valueColor={displayData.alignmentGaps > 0 ? 'text-secondary-bronze' : undefined}
            />

            <CompactKPITile
              label="Risks"
              value={displayData.totalRisks}
              subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
              icon={<Shield size={18} />}
              onClick={() => navigate('/enterprise/risks')}
              accentColor={displayData.highRisks > 0 ? 'danger' : 'muted'}
              valueColor={displayData.highRisks > 0 ? 'text-status-danger' : undefined}
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
    primary: 'var(--primary)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    bronze: 'var(--secondary-bronze)',
    muted: 'transparent',
  };

  const iconColors: Record<string, string> = {
    primary: 'text-primary',
    warning: 'text-status-warning',
    danger: 'text-status-danger',
    bronze: 'text-secondary-bronze',
    muted: 'text-muted-foreground',
  };

  return (
    <button
      onClick={onClick}
      className="p-3 rounded-md text-left transition-all relative group w-full bg-muted/50 border border-border/50 hover:bg-accent hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: accentBorders[accentColor],
        minHeight: '100px',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(TYPOGRAPHY.cardLabel, TEXT_COLORS.muted)}>
          {label}
        </span>
        <span className={iconColors[accentColor]}>{icon}</span>
      </div>
      
      {/* Primary Value */}
      <span className={cn(
        TYPOGRAPHY.primaryMetric, 
        'block',
        valueColor || TEXT_COLORS.primary
      )}>
        {value}
      </span>
      
      {/* Subtext */}
      <p className={cn(TYPOGRAPHY.subtext, TEXT_COLORS.muted, 'mt-1')}>
        {subtext}
      </p>

      {showProgress && (
        <div className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden bg-border">
          <div 
            className="h-full rounded-full transition-all bg-primary"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}

      <ChevronRight 
        size={14} 
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" 
      />
    </button>
  );
}
