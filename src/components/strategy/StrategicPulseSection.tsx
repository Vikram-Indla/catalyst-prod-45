/**
 * StrategicPulseSection — Hero section answering "Are we winning?"
 * Aggregate health status + key metrics in a glanceable format
 */

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
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface StrategicPulseSectionProps {
  snapshotId?: string;
}

type OverallStatus = 'on-track' | 'at-risk' | 'off-track';

export function StrategicPulseSection({ snapshotId }: StrategicPulseSectionProps) {
  const navigate = useNavigate();
  
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  // Fetch risks
  const { data: riskData, isLoading: risksLoading } = useQuery({
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
  });

  const isLoading = okrLoading || countsLoading || risksLoading;

  // Calculate metrics
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

  // Determine overall status
  const determineOverallStatus = (): OverallStatus => {
    if (!hasObjectives) return 'at-risk';
    if (highRisks > 2 || atRiskCount > 3 || overallProgress < 30) return 'off-track';
    if (highRisks > 0 || atRiskCount > 0 || alignmentGaps > 3 || overallProgress < 60) return 'at-risk';
    return 'on-track';
  };

  const overallStatus = determineOverallStatus();

  const statusConfig = {
    'on-track': {
      label: 'On Track',
      icon: CheckCircle2,
      color: 'var(--status-success)',
      bg: 'var(--status-success-bg)',
      border: 'var(--status-success)',
    },
    'at-risk': {
      label: 'At Risk',
      icon: AlertCircle,
      color: 'var(--status-warning)',
      bg: 'var(--status-warning-bg)',
      border: 'var(--status-warning)',
    },
    'off-track': {
      label: 'Off Track',
      icon: AlertTriangle,
      color: 'var(--status-danger)',
      bg: 'var(--status-danger-bg)',
      border: 'var(--status-danger)',
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  // Trend indicator (placeholder - would need historical data)
  const TrendIcon = overallProgress >= 50 ? TrendingUp : overallProgress >= 30 ? Minus : TrendingDown;
  const trendColor = overallProgress >= 50 ? 'var(--status-success)' : overallProgress >= 30 ? 'var(--text-muted)' : 'var(--status-danger)';

  if (isLoading) {
    return (
      <section 
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="p-6 flex items-center justify-center">
          <div 
            className="animate-spin rounded-full h-6 w-6 border-2"
            style={{ borderColor: 'var(--border-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2 
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Strategic Pulse
        </h2>
        <p 
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          How healthy is the enterprise strategy right now?
        </p>
      </div>

      <div className="p-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left: Overall Status Hero */}
          <div 
            className="flex-shrink-0 lg:w-[280px] p-5 rounded-xl flex flex-col items-center justify-center text-center"
            style={{
              backgroundColor: config.bg,
              border: `1px solid ${config.border}`,
            }}
          >
            <StatusIcon 
              size={40} 
              style={{ color: config.color }}
              className="mb-3"
            />
            <span 
              className="text-2xl font-bold mb-1"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            <span 
              className="text-[12px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Overall Strategy Health
            </span>
            
            {/* Progress with trend */}
            <div className="flex items-center gap-2 mt-4">
              <span 
                className="text-3xl font-bold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {hasObjectives ? `${overallProgress}%` : '—'}
              </span>
              {hasObjectives && (
                <TrendIcon size={20} style={{ color: trendColor }} />
              )}
            </div>
            <span 
              className="text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {hasObjectives ? `${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''} tracked` : 'No objectives yet'}
            </span>
          </div>

          {/* Right: KPI Grid */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Progress */}
            <KPICard
              label="Progress"
              value={hasObjectives ? `${overallProgress}%` : '—'}
              subtext="Avg completion"
              icon={<BarChart3 size={16} />}
              iconColor="#5C7C5C"
              onClick={() => navigate('/enterprise/okr-hub')}
              showBar
              barValue={overallProgress}
              barColor="#5C7C5C"
            />
            
            {/* At Risk */}
            <KPICard
              label="At Risk"
              value={atRiskCount}
              subtext={atRiskCount === 0 ? 'All healthy' : 'Need attention'}
              icon={<AlertTriangle size={16} />}
              iconColor={atRiskCount > 0 ? '#B85C5C' : '#5C7C5C'}
              onClick={() => navigate('/enterprise/okr-hub')}
              highlight={atRiskCount > 0}
            />
            
            {/* Gaps */}
            <KPICard
              label="Gaps"
              value={alignmentGaps}
              subtext={alignmentGaps === 0 ? 'Fully aligned' : 'Unaligned items'}
              icon={<Target size={16} />}
              iconColor={alignmentGaps > 0 ? '#8B7355' : '#5C7C5C'}
              onClick={() => navigate('/enterprise/backlog')}
              highlight={alignmentGaps > 0}
            />
            
            {/* Risks */}
            <KPICard
              label="Open Risks"
              value={openRisks}
              subtext={highRisks > 0 ? `${highRisks} high severity` : 'No critical risks'}
              icon={<Shield size={16} />}
              iconColor={highRisks > 0 ? '#B85C5C' : '#5C7C5C'}
              onClick={() => navigate('/enterprise/risks')}
              highlight={highRisks > 0}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  iconColor: string;
  onClick?: () => void;
  showBar?: boolean;
  barValue?: number;
  barColor?: string;
  highlight?: boolean;
}

function KPICard({ 
  label, 
  value, 
  subtext, 
  icon, 
  iconColor, 
  onClick,
  showBar,
  barValue = 0,
  barColor,
  highlight
}: KPICardProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg text-left transition-all duration-150 group"
      style={{
        backgroundColor: highlight ? 'var(--status-warning-bg)' : 'var(--surface-subtle)',
        border: `1px solid ${highlight ? 'var(--status-warning)' : 'var(--border-subtle)'}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = highlight ? 'var(--status-warning)' : 'var(--border-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span 
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      
      <span 
        className="text-xl font-bold tabular-nums block mb-0.5"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
      
      <span 
        className="text-[11px] block"
        style={{ color: 'var(--text-muted)' }}
      >
        {subtext}
      </span>

      {showBar && (
        <div 
          className="w-full h-1 rounded-full mt-2 overflow-hidden"
          style={{ backgroundColor: 'var(--progress-bg)' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${barValue}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      )}
    </button>
  );
}
