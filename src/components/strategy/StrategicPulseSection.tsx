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
  Loader2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TYPOGRAPHY, TEXT_COLORS } from './strategyRoomTypography';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Calculation explanations for each metric
const METRIC_TOOLTIPS = {
  strategyHealth: `Strategy Health is determined by:
• On Track: Progress ≥60%, no at-risk objectives, ≤3 gaps, no high risks
• At Risk: 1+ at-risk objectives, >3 gaps, 1-2 high risks, or progress 30-60%
• Off Track: Progress <30%, >3 at-risk objectives, or >2 high risks
• No Data: No objectives, risks, or work items defined`,
  progress: `Progress = Average progress across all objectives.
Each objective's progress is the average of its Key Results' completion %.`,
  atRisk: `At Risk = Count of objectives with health status 'at_risk' or 'poor'.
Health is based on progress vs. expected timeline and key result status.`,
  gaps: `Gaps = Unlinked Epics + Unlinked Features.
Unlinked items are not connected to any strategic theme or objective.`,
  risks: `Risks = Total open risks (not closed).
High risks are those with Critical or High impact rating.`,
};

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
    'no-data': { label: 'No Data', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  };

  const isNoData = displayData.overallStatus === 'no-data';

  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';

  // Skeleton only on first load - matches final layout dimensions
  if (isLoading && !hasData) {
    return (
      <section className="rounded-lg overflow-hidden bg-card/50 dark:bg-card/30">
        <div className="px-4 py-2.5 bg-muted/30 dark:bg-muted/10">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Primary card skeleton */}
            <div className="lg:w-[220px] flex-shrink-0 p-4 rounded-md bg-muted/40 dark:bg-muted/20 min-h-[120px]">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Secondary cards skeleton */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {['s1', 's2', 's3', 's4'].map((key) => (
                <div key={key} className="p-3 rounded-md bg-muted/40 dark:bg-muted/20 min-h-[100px]">
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
    <section className="rounded-lg overflow-hidden bg-card/50 dark:bg-card/30">
      {/* Section Header - surface separation via background, not border */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-muted/30 dark:bg-muted/10">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <h2 className={cn(TYPOGRAPHY.sectionTitle, TEXT_COLORS.primary)}>
            Strategic Pulse
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Stale data indicator - CATALYST STANDARD */}
          {showStaleIndicator && (
            <span className="text-[11px] text-muted-foreground italic">
              Data may be stale
            </span>
          )}
          {/* Refreshing indicator - CATALYST STANDARD: small spinner + text */}
          {isUpdating && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <TooltipProvider>
        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* PRIMARY CARD: Strategy Health */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="lg:w-[220px] flex-shrink-0 p-4 rounded-md flex flex-col justify-between bg-muted/40 dark:bg-muted/20 cursor-help"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: isNoData 
                      ? 'var(--border-muted)'
                      : displayData.overallStatus === 'on-track' 
                        ? 'var(--status-success)' 
                        : displayData.overallStatus === 'at-risk' 
                          ? 'var(--status-warning)' 
                          : 'var(--status-danger)',
                    minHeight: '120px',
                  }}
                >
                  <div>
                    {/* Label with info icon */}
                    <div className="flex items-center justify-between">
                      <span className={cn(TYPOGRAPHY.cardLabel, TEXT_COLORS.secondaryStrong)}>
                        Strategy Health
                      </span>
                      <Info size={14} className="text-muted-foreground opacity-60" />
                    </div>
                    
                    {/* Primary Value: Status badge */}
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded font-semibold",
                          "text-[14px] leading-[18px]",
                          config.bgClass,
                        )}
                        style={{ color: isNoData ? 'inherit' : '#ffffff' }}
                      >
                        {config.label}
                      </span>
                    </div>
                    
                    {/* Subtext */}
                    <p className={cn(TYPOGRAPHY.subtext, TEXT_COLORS.secondaryStrong, 'mt-2')}>
                      {isNoData 
                        ? 'No data to calculate'
                        : displayData.overallStatus === 'on-track' 
                          ? 'Execution on track' 
                          : displayData.overallStatus === 'at-risk' 
                            ? 'Needs attention' 
                            : 'Intervention needed'}
                    </p>
                  </div>

                  {/* Trend indicator */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/30 dark:border-border/20">
                    {isNoData ? (
                      <span className={cn(TYPOGRAPHY.subtext, 'font-medium', 'text-muted-foreground')}>
                        — · Add objectives to see trends
                      </span>
                    ) : (
                      <>
                        <TrendIcon size={16} className={config.textClass} />
                        <span className={cn(TYPOGRAPHY.subtext, 'font-medium', TEXT_COLORS.secondaryStrong)}>
                          {overallProgress}% · {trendLabel}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
                {METRIC_TOOLTIPS.strategyHealth}
              </TooltipContent>
            </Tooltip>

            {/* SECONDARY CARDS: Metrics grid */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <CompactKPITile
                label="Progress"
                value={displayData.objectivesCount > 0 ? `${overallProgress}%` : '—'}
                subtext={displayData.objectivesCount > 0 ? `${displayData.objectivesCount} objectives` : 'No objectives'}
                icon={<BarChart3 size={18} />}
                onClick={() => navigate('/enterprise/okr-hub')}
                accentColor={displayData.objectivesCount > 0 ? 'primary' : 'muted'}
                showProgress={displayData.objectivesCount > 0}
                progressValue={overallProgress}
                tooltip={METRIC_TOOLTIPS.progress}
              />

              <CompactKPITile
                label="At Risk"
                value={displayData.objectivesCount > 0 ? atRiskCount : '—'}
                subtext={displayData.objectivesCount === 0 ? 'No objectives' : atRiskCount === 0 ? 'All healthy' : 'Need attention'}
                icon={<AlertTriangle size={18} />}
                onClick={() => navigate('/enterprise/okr-hub')}
                accentColor={displayData.objectivesCount > 0 && atRiskCount > 0 ? 'warning' : 'muted'}
                tooltip={METRIC_TOOLTIPS.atRisk}
              />

              <CompactKPITile
                label="Gaps"
                value={displayData.alignmentGaps}
                subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
                icon={<Target size={18} />}
                onClick={() => navigate('/enterprise/backlog')}
                accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
                tooltip={METRIC_TOOLTIPS.gaps}
              />

              <CompactKPITile
                label="Risks"
                value={displayData.totalRisks}
                subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
                icon={<Shield size={18} />}
                onClick={() => navigate('/enterprise/risks')}
                accentColor={displayData.highRisks > 0 ? 'danger' : 'muted'}
                tooltip={METRIC_TOOLTIPS.risks}
              />
            </div>
          </div>
        </div>
      </TooltipProvider>
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
  tooltip?: string;
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
  progressValue = 0,
  tooltip
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
    muted: 'text-foreground/60',
  };

  const tileContent = (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-md text-left relative group w-full bg-muted/40 dark:bg-muted/20",
        "transition-colors duration-150 ease-out",
        "hover:bg-muted/60 dark:hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: accentBorders[accentColor],
        minHeight: '100px',
      }}
    >
      {/* Label row - icon supports, doesn't compete */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn(TYPOGRAPHY.cardLabel, TEXT_COLORS.secondaryStrong)}>
            {label}
          </span>
          {tooltip && <Info size={12} className="text-muted-foreground opacity-60" />}
        </div>
        <span className={iconColors[accentColor]}>{icon}</span>
      </div>
      
      {/* Primary Value - strongest visual weight */}
      <span className={cn(
        TYPOGRAPHY.primaryMetric, 
        'block',
        valueColor || TEXT_COLORS.primary
      )}>
        {value}
      </span>
      
      {/* Subtext - secondary but readable */}
      <p className={cn(TYPOGRAPHY.subtext, TEXT_COLORS.secondaryStrong, 'mt-1')}>
        {subtext}
      </p>

      {/* Progress bar - secondary signal */}
      {showProgress && (
        <div className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden bg-muted/60 dark:bg-muted/40">
          <div 
            className="h-full rounded-full bg-primary/80"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}

      {/* Subtle chevron on hover - discoverable but restrained */}
      <ChevronRight 
        size={14} 
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition-opacity duration-150 text-[var(--fg-3)]" 
      />
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {tileContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return tileContent;
}
