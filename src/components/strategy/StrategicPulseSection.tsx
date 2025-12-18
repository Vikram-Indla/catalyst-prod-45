/**
 * StrategicPulseSection — CIO Cockpit "Pulse Strip"
 * Unified design: 5 tiles feel like one cohesive system
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Skeleton only on first load
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
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="h-3 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="p-2.5">
          <div className="flex flex-col lg:flex-row gap-2">
            <div 
              className="lg:w-[200px] min-h-[100px] p-3 rounded-md flex-shrink-0 animate-pulse"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            />
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              {['s1', 's2', 's3', 's4'].map((key) => (
                <div 
                  key={key}
                  className="p-2.5 rounded-md min-h-[52px] animate-pulse"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                />
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
      {/* Section Header - Unified strip header */}
      <div 
        className="px-4 py-1.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: 'var(--brand-primary)' }} />
          <h2 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Strategic Pulse
          </h2>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Updating…</span>
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex flex-col lg:flex-row gap-2">
          {/* PRIMARY CARD: Strategy Health - Consistent height with secondaries */}
          <div 
            className="lg:w-[200px] flex-shrink-0 p-3 rounded-md flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderLeft: `3px solid ${displayData.overallStatus === 'on-track' ? 'var(--status-success)' : displayData.overallStatus === 'at-risk' ? 'var(--status-warning)' : 'var(--status-danger)'}`,
              minHeight: '88px',
            }}
          >
            <div>
              <span 
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                Strategy Health
              </span>
              
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                  config.bgClass, "text-white"
                )}>
                  {config.label}
                </span>
              </div>
              
              <p 
                className="text-[10px] mt-1 leading-tight"
                style={{ color: 'var(--text-muted)' }}
              >
                {displayData.overallStatus === 'on-track' 
                  ? 'Execution on track' 
                  : displayData.overallStatus === 'at-risk' 
                    ? 'Needs attention' 
                    : 'Intervention needed'}
              </p>
            </div>

            {/* Trend indicator */}
            <div className="flex items-center gap-1 mt-2 pt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <TrendIcon size={10} className={config.textClass} />
              <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {overallProgress}% · {trendLabel}
              </span>
            </div>
          </div>

          {/* SECONDARY CARDS: Compact metrics grid */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            <CompactKPITile
              label="Progress"
              value={displayData.objectivesCount > 0 ? `${overallProgress}%` : '—'}
              subtext={`${displayData.objectivesCount} objectives`}
              icon={<BarChart3 size={11} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor="primary"
              showProgress={displayData.objectivesCount > 0}
              progressValue={overallProgress}
            />

            <CompactKPITile
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={11} />}
              onClick={() => navigate('/enterprise/okr-hub')}
              accentColor={atRiskCount > 0 ? 'warning' : 'muted'}
              valueColor={atRiskCount > 0 ? 'var(--status-warning)' : undefined}
            />

            <CompactKPITile
              label="Gaps"
              value={displayData.alignmentGaps}
              subtext={displayData.alignmentGaps === 0 ? 'Aligned' : 'Unlinked'}
              icon={<Target size={11} />}
              onClick={() => navigate('/enterprise/backlog')}
              accentColor={displayData.alignmentGaps > 0 ? 'bronze' : 'muted'}
              valueColor={displayData.alignmentGaps > 0 ? 'var(--secondary-bronze)' : undefined}
            />

            <CompactKPITile
              label="Risks"
              value={displayData.totalRisks}
              subtext={displayData.highRisks > 0 ? `${displayData.highRisks} high` : 'No critical'}
              icon={<Shield size={11} />}
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
    muted: 'var(--text-muted)',
  };

  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md text-left transition-all relative group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `2px solid ${accentBorders[accentColor]}`,
        minHeight: '52px',
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
          className="text-[9px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <span style={{ color: iconColors[accentColor] }}>{icon}</span>
      </div>
      
      <span 
        className="text-base font-bold tabular-nums block leading-tight"
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </span>
      
      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
        {subtext}
      </p>

      {showProgress && (
        <div 
          className="w-full h-0.5 rounded-full mt-1 overflow-hidden"
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
        size={9} 
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-40 transition-opacity" 
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
}
