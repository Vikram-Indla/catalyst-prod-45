/**
 * SnapshotHealthStrip — Compact executive health metrics strip
 * Read-only strip answering: Overall progress, At risk, Alignment gaps, Risk exposure
 */

import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Target, Shield } from 'lucide-react';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SnapshotHealthStripProps {
  snapshotId?: string;
}

interface MetricPillProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
}

function MetricPill({ label, value, icon, status = 'neutral', onClick }: MetricPillProps) {
  const statusStyles = {
    success: {
      bg: 'var(--status-success-bg)',
      border: 'var(--status-success)',
      text: 'var(--status-success)',
    },
    warning: {
      bg: 'var(--status-warning-bg)',
      border: 'var(--status-warning)',
      text: 'var(--status-warning)',
    },
    danger: {
      bg: 'var(--status-danger-bg)',
      border: 'var(--status-danger)',
      text: 'var(--status-danger)',
    },
    neutral: {
      bg: 'var(--surface-subtle)',
      border: 'var(--border-subtle)',
      text: 'var(--text-secondary)',
    },
  };

  const style = statusStyles[status];

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <span style={{ color: style.text }}>{icon}</span>
      <span 
        className="text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <span 
        className="text-sm font-semibold tabular-nums"
        style={{ color: style.text }}
      >
        {value}
      </span>
    </button>
  );
}

export function SnapshotHealthStrip({ snapshotId }: SnapshotHealthStripProps) {
  const navigate = useNavigate();
  
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  // Fetch risks
  const { data: riskData, isLoading: risksLoading } = useQuery({
    queryKey: ['snapshot-health-risks', snapshotId],
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

      return {
        total: riskList.length,
        high,
      };
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

  // Determine statuses
  const progressStatus = overallProgress >= 70 ? 'success' : overallProgress >= 40 ? 'warning' : 'danger';
  const atRiskStatus = atRiskCount === 0 ? 'success' : atRiskCount <= 2 ? 'warning' : 'danger';
  const gapStatus = alignmentGaps === 0 ? 'success' : alignmentGaps <= 3 ? 'warning' : 'danger';
  const riskStatus = highRisks === 0 ? 'success' : highRisks <= 2 ? 'warning' : 'danger';

  if (isLoading) {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
        style={{
          backgroundColor: 'var(--surface-subtle)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div 
          className="animate-pulse h-4 w-32 rounded"
          style={{ backgroundColor: 'var(--surface-hover)' }}
        />
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 flex-wrap"
    >
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider mr-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        Health:
      </span>
      
      <MetricPill
        label="Progress"
        value={hasObjectives ? `${overallProgress}%` : '—'}
        icon={<TrendingUp size={14} />}
        status={hasObjectives ? progressStatus : 'neutral'}
        onClick={() => navigate('/enterprise/okr-hub')}
      />
      
      <MetricPill
        label="At Risk"
        value={atRiskCount}
        icon={<AlertTriangle size={14} />}
        status={hasObjectives ? atRiskStatus : 'neutral'}
        onClick={() => navigate('/enterprise/okr-hub')}
      />
      
      <MetricPill
        label="Gaps"
        value={alignmentGaps}
        icon={<Target size={14} />}
        status={gapStatus}
        onClick={() => navigate('/strategyhub/backlog')}
      />
      
      <MetricPill
        label="Risks"
        value={openRisks}
        icon={<Shield size={14} />}
        status={riskStatus}
        onClick={() => navigate('/enterprise/risks')}
      />
    </div>
  );
}
