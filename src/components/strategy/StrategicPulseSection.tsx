/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Uses global Catalyst design tokens
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

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
  const showStaleIndicator = isStale && !isFetching && !!error;

  const atRiskCount = displayData.atRiskObjectives?.length ?? 0;
  const overallProgress = displayData.avgProgress;

  const statusConfig = {
    'on-track': { label: 'On Track', variant: 'success' as const, bgClass: 'bg-emerald-50 dark:bg-emerald-950/30', textClass: 'text-emerald-700 dark:text-emerald-400', borderClass: 'border-l-emerald-500' },
    'at-risk': { label: 'At Risk', variant: 'warning' as const, bgClass: 'bg-amber-50 dark:bg-amber-950/30', textClass: 'text-amber-700 dark:text-amber-400', borderClass: 'border-l-amber-500' },
    'off-track': { label: 'Off Track', variant: 'danger' as const, bgClass: 'bg-red-50 dark:bg-red-950/30', textClass: 'text-red-700 dark:text-red-400', borderClass: 'border-l-red-500' },
    'no-data': { label: 'No Data', variant: 'muted' as const, bgClass: 'bg-muted', textClass: 'text-muted-foreground', borderClass: 'border-l-muted-foreground' },
  };

  const isNoData = displayData.overallStatus === 'no-data';
  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';

  // Skeleton only on first load
  if (isLoading && !hasData) {
    return (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Skeleton className="lg:w-[220px] h-[140px] rounded-lg flex-shrink-0" />
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[100px] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Strategic Pulse</span>
        </div>
        <div className="flex items-center gap-2">
          {showStaleIndicator && (
            <span className="text-[10px] text-muted-foreground italic">
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <TooltipProvider>
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* PRIMARY CARD: Strategy Health */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "rounded-lg border border-border p-5 min-h-[140px] flex flex-col cursor-help transition-all hover:shadow-sm",
                    "lg:w-[220px] flex-shrink-0",
                    "border-l-4",
                    config.borderClass
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Strategy Health</span>
                      <Info size={14} className="text-muted-foreground/60" />
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded text-sm font-semibold",
                        config.bgClass,
                        config.textClass
                      )}>
                        {config.label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-2">
                      {isNoData 
                        ? 'No data to calculate'
                        : displayData.overallStatus === 'on-track' 
                          ? 'Execution on track' 
                          : displayData.overallStatus === 'at-risk' 
                            ? 'Needs attention' 
                            : 'Intervention needed'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                    {isNoData ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        — · Add objectives to see trends
                      </span>
                    ) : (
                      <>
                        <TrendIcon size={16} className={config.textClass} />
                        <span className="text-sm font-medium text-foreground">
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
                accentColor={displayData.objectivesCount > 0 ? 'accent' : undefined}
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
                accentColor={displayData.objectivesCount > 0 && atRiskCount > 0 ? 'warning' : undefined}
                tooltip={METRIC_TOOLTIPS.atRisk}
              />

              <CompactKPITile
                label="Gaps"
                value={displayData.alignmentGaps}
                subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
                icon={<Target size={18} />}
                onClick={() => navigate('/enterprise/backlog')}
                accentColor={displayData.alignmentGaps > 0 ? 'warning' : undefined}
                tooltip={METRIC_TOOLTIPS.gaps}
              />

              <CompactKPITile
                label="Risks"
                value={displayData.totalRisks}
                subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
                icon={<Shield size={18} />}
                onClick={() => navigate('/enterprise/risks')}
                accentColor={displayData.highRisks > 0 ? 'danger' : undefined}
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
  accentColor?: 'accent' | 'warning' | 'danger';
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
  accentColor,
  showProgress,
  progressValue = 0,
  tooltip
}: CompactKPITileProps) {
  const accentStyles = {
    accent: { borderClass: 'border-l-primary', iconClass: 'text-primary' },
    warning: { borderClass: 'border-l-amber-500', iconClass: 'text-amber-500' },
    danger: { borderClass: 'border-l-red-500', iconClass: 'text-red-500' },
  };
  
  const styles = accentColor ? accentStyles[accentColor] : { borderClass: '', iconClass: 'text-muted-foreground' };

  const tileContent = (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-lg border border-border p-4 min-h-[100px] flex flex-col text-left w-full",
        "transition-all hover:shadow-sm hover:border-border/80 group",
        accentColor && "border-l-4",
        styles.borderClass
      )}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          {tooltip && <Info size={12} className="text-muted-foreground/60" />}
        </div>
        <span className={styles.iconClass}>
          {icon}
        </span>
      </div>
      
      {/* Primary Value */}
      <span className="text-xl font-bold text-foreground">
        {value}
      </span>
      
      {/* Subtext */}
      <p className="text-sm text-muted-foreground mt-1">
        {subtext}
      </p>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full h-1.5 rounded-sm mt-3 overflow-hidden bg-muted">
          <div 
            className="h-full rounded-sm bg-primary/80"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}

      {/* Hover chevron */}
      <ChevronRight 
        size={14} 
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground"
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
