/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Ring-fenced design using sr-* CSS classes from strategy-room.css
 * 
 * Primary: Strategy Health (large left card)
 * Secondary: Progress, At Risk, Gaps, Open Risks (compact right cards)
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
    'on-track': { label: 'On Track', variant: 'success' as const },
    'at-risk': { label: 'At Risk', variant: 'warning' as const },
    'off-track': { label: 'Off Track', variant: 'danger' as const },
    'no-data': { label: 'No Data', variant: 'muted' as const },
  };

  const isNoData = displayData.overallStatus === 'no-data';
  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';

  // Skeleton only on first load - uses sr-* classes
  if (isLoading && !hasData) {
    return (
      <section className="sr-section">
        <div className="sr-section-header">
          <div className="sr-skeleton h-4 w-32" />
        </div>
        <div className="sr-kpi-grid" style={{ gridTemplateColumns: '240px 1fr' }}>
          {/* Primary card skeleton */}
          <div className="sr-kpi-card">
            <div className="sr-skeleton h-3 w-24 mb-3" />
            <div className="sr-skeleton h-7 w-20 mb-2" />
            <div className="sr-skeleton h-2.5 w-28" />
          </div>
          {/* Secondary cards skeleton */}
          <div className="sr-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sr-kpi-card" style={{ minHeight: '100px' }}>
                <div className="sr-skeleton h-2.5 w-14 mb-2" />
                <div className="sr-skeleton h-5 w-10 mb-1" />
                <div className="sr-skeleton h-2 w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section className="sr-section">
      {/* Section Header */}
      <div className="sr-section-header">
        <div className="sr-section-title">
          <Activity size={14} className="sr-section-title-icon" />
          <span className="sr-section-title-text">Strategic Pulse</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          {showStaleIndicator && (
            <span className="sr-section-subtitle" style={{ fontStyle: 'italic' }}>
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-1)', fontSize: 'var(--sr-text-xs)', color: 'var(--sr-text-tertiary)' }}>
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <TooltipProvider>
        <div style={{ padding: 'var(--sr-space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sr-space-3)' }} className="lg:flex-row">
            {/* PRIMARY CARD: Strategy Health */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn("sr-kpi-card cursor-help", config.variant)}
                  style={{ width: '220px', flexShrink: 0 }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="sr-kpi-label">Strategy Health</span>
                      <Info size={14} style={{ color: 'var(--sr-text-muted)', opacity: 0.6 }} />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)', marginTop: 'var(--sr-space-2)' }}>
                      <span className={cn("sr-status-badge", config.variant)}>
                        {config.label}
                      </span>
                    </div>
                    
                    <p className="sr-kpi-trend" style={{ marginTop: 'var(--sr-space-2)' }}>
                      {isNoData 
                        ? 'No data to calculate'
                        : displayData.overallStatus === 'on-track' 
                          ? 'Execution on track' 
                          : displayData.overallStatus === 'at-risk' 
                            ? 'Needs attention' 
                            : 'Intervention needed'}
                    </p>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--sr-space-2)', 
                    marginTop: 'var(--sr-space-3)', 
                    paddingTop: 'var(--sr-space-2)', 
                    borderTop: '1px solid var(--sr-border-light)' 
                  }}>
                    {isNoData ? (
                      <span style={{ fontSize: 'var(--sr-text-sm)', fontWeight: 'var(--sr-font-medium)', color: 'var(--sr-text-muted)' }}>
                        — · Add objectives to see trends
                      </span>
                    ) : (
                      <>
                        <TrendIcon size={16} style={{ color: config.variant === 'success' ? 'var(--sr-status-success)' : config.variant === 'warning' ? 'var(--sr-status-warning)' : 'var(--sr-status-danger)' }} />
                        <span style={{ fontSize: 'var(--sr-text-sm)', fontWeight: 'var(--sr-font-medium)', color: 'var(--sr-text-secondary)' }}>
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
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sr-space-2)' }}>
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
  const tileContent = (
    <button
      onClick={onClick}
      className={cn("sr-kpi-card", accentColor)}
      style={{ 
        minHeight: '100px',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sr-space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-1)' }}>
          <span className="sr-kpi-label">{label}</span>
          {tooltip && <Info size={12} style={{ color: 'var(--sr-text-muted)', opacity: 0.6 }} />}
        </div>
        <span style={{ color: accentColor ? `var(--sr-status-${accentColor === 'accent' ? 'success' : accentColor})` : 'var(--sr-text-tertiary)' }}>
          {icon}
        </span>
      </div>
      
      {/* Primary Value */}
      <span className="sr-kpi-value" style={{ fontSize: 'var(--sr-text-xl)' }}>
        {value}
      </span>
      
      {/* Subtext */}
      <p className="sr-kpi-trend" style={{ marginTop: 'var(--sr-space-1)' }}>
        {subtext}
      </p>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ 
          width: '100%', 
          height: '6px', 
          borderRadius: 'var(--sr-radius-sm)', 
          marginTop: 'var(--sr-space-3)', 
          overflow: 'hidden', 
          backgroundColor: 'var(--sr-surface-muted)' 
        }}>
          <div 
            style={{ 
              height: '100%', 
              borderRadius: 'var(--sr-radius-sm)', 
              backgroundColor: 'var(--sr-accent)',
              width: `${progressValue}%`,
              opacity: 0.8,
            }}
          />
        </div>
      )}

      {/* Hover chevron */}
      <ChevronRight 
        size={14} 
        style={{ 
          position: 'absolute', 
          top: 'var(--sr-space-3)', 
          right: 'var(--sr-space-3)', 
          opacity: 0, 
          transition: 'opacity var(--sr-transition)',
          color: 'var(--sr-text-tertiary)',
        }} 
        className="group-hover:opacity-60"
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
