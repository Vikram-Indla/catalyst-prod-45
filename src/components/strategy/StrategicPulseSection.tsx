/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Uses ring-fenced --sr-* CSS tokens (V8 design system)
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
  const showStaleIndicator = isStale && !isFetching && !!error;

  const atRiskCount = displayData.atRiskObjectives?.length ?? 0;
  const overallProgress = displayData.avgProgress;

  const statusConfig = {
    'on-track': { label: 'On Track', variant: 'healthy' as const },
    'at-risk': { label: 'At Risk', variant: 'at-risk' as const },
    'off-track': { label: 'Off Track', variant: 'critical' as const },
    'no-data': { label: 'No Data', variant: 'muted' as const },
  };

  const isNoData = displayData.overallStatus === 'no-data';
  const config = statusConfig[displayData.overallStatus];
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendLabel = overallProgress >= 50 ? 'Ahead' : overallProgress >= 30 ? 'On pace' : 'Behind';
  const isPositiveTrend = overallProgress >= 50;

  // Skeleton only on first load
  if (isLoading && !hasData) {
    return (
      <section className="sr-section">
        <div className="sr-section-header">
          <Activity size={14} style={{ color: 'var(--sr-accent)' }} />
          <span>Strategic Pulse</span>
        </div>
        <div className="sr-pulse-grid">
          <div className="sr-skeleton" style={{ height: '140px' }} />
          <div className="sr-skeleton" style={{ height: '100px' }} />
          <div className="sr-skeleton" style={{ height: '100px' }} />
          <div className="sr-skeleton" style={{ height: '100px' }} />
          <div className="sr-skeleton" style={{ height: '100px' }} />
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section className="sr-section">
      {/* Section Header */}
      <div className="sr-section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          <Activity size={14} style={{ color: 'var(--sr-accent)' }} />
          <span>Strategic Pulse</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          {showStaleIndicator && (
            <span style={{ fontSize: 'var(--sr-font-size-xs)', color: 'var(--sr-text-muted)', fontStyle: 'italic' }}>
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div className="sr-refreshing">
              <div className="sr-refreshing-spinner" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <TooltipProvider>
        <div className="sr-pulse-grid">
          {/* PRIMARY CARD: Strategy Health (Hero) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <article 
                className={cn(
                  "sr-kpi-card hero",
                  config.variant === 'healthy' && 'healthy',
                  config.variant === 'critical' && 'critical'
                )}
                tabIndex={0}
              >
                <div className="sr-kpi-header">
                  <span className="sr-kpi-label">Strategy Health</span>
                  <Info size={14} className="sr-kpi-icon" />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-3)', flexWrap: 'wrap' }}>
                  <span className={cn("sr-status-badge", config.variant)}>
                    {config.label}
                  </span>
                  {!isNoData && (
                    <span className={cn("sr-trend", !isPositiveTrend && "negative")}>
                      {isPositiveTrend ? '↑' : '↓'} {overallProgress}% {trendLabel}
                    </span>
                  )}
                </div>
                
                <div className="sr-kpi-sublabel" style={{ marginTop: 'var(--sr-space-2)' }}>
                  {isNoData 
                    ? 'No data to calculate'
                    : displayData.overallStatus === 'on-track' 
                      ? 'Execution on track' 
                      : displayData.overallStatus === 'at-risk' 
                        ? 'Needs attention' 
                        : 'Intervention needed'}
                </div>
              </article>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
              {METRIC_TOOLTIPS.strategyHealth}
            </TooltipContent>
          </Tooltip>

          {/* SECONDARY CARDS: 4 KPI tiles */}
          <CompactKPITile
            label="Progress"
            value={displayData.objectivesCount > 0 ? `${overallProgress}%` : '—'}
            subtext={displayData.objectivesCount > 0 ? `${displayData.objectivesCount} objectives` : 'No objectives'}
            icon={<BarChart3 size={18} />}
            onClick={() => navigate('/enterprise/okr-hub')}
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
  const getAccentStyles = () => {
    switch (accentColor) {
      case 'warning': return { borderColor: 'var(--sr-status-at-risk)', iconColor: 'var(--sr-status-at-risk)' };
      case 'danger': return { borderColor: 'var(--sr-status-critical)', iconColor: 'var(--sr-status-critical)' };
      case 'accent': return { borderColor: 'var(--sr-accent)', iconColor: 'var(--sr-accent)' };
      default: return { borderColor: 'var(--sr-border)', iconColor: 'var(--sr-text-light)' };
    }
  };
  
  const styles = getAccentStyles();

  const tileContent = (
    <article 
      className="sr-kpi-card"
      onClick={onClick}
      tabIndex={0}
      style={{
        borderLeft: accentColor ? `4px solid ${styles.borderColor}` : undefined,
      }}
    >
      <div className="sr-kpi-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-1)' }}>
          <span className="sr-kpi-label">{label}</span>
          {tooltip && <Info size={12} style={{ color: 'var(--sr-text-light)', opacity: 0.6 }} />}
        </div>
        <span style={{ color: styles.iconColor }}>
          {icon}
        </span>
      </div>
      
      <div className="sr-kpi-value">
        {value}
      </div>
      
      <div className="sr-kpi-sublabel">
        {subtext}
      </div>

      {showProgress && (
        <div className="sr-kpi-progress-bar">
          <div 
            className="sr-kpi-progress-fill"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}

      <ChevronRight 
        size={14} 
        style={{
          position: 'absolute',
          top: 'var(--sr-space-3)',
          right: 'var(--sr-space-3)',
          opacity: 0,
          color: 'var(--sr-text-muted)',
          transition: 'opacity var(--sr-transition-fast)',
        }}
        className="sr-kpi-chevron"
      />
    </article>
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
