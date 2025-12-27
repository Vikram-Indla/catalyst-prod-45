import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, AlertTriangle, Target, Shield } from 'lucide-react';

interface ExecutiveSummaryCardProps {
  snapshotId?: string;
}

interface RiskData {
  high: number;
  medium: number;
  low: number;
  total: number;
  highestSeverity: string | null;
}

interface KPITileProps {
  label: string;
  value: number | string;
  subtext: string;
  onClick: () => void;
  isLoading?: boolean;
  accentColor: 'green' | 'olive' | 'bronze' | 'red';
  icon: React.ReactNode;
  iconBgColor: string;
  showProgress?: boolean;
  progressValue?: number;
}

function KPITile({ 
  label, 
  value, 
  subtext, 
  onClick, 
  isLoading = false,
  accentColor,
  icon,
  iconBgColor,
  showProgress = false,
  progressValue = 0,
}: KPITileProps) {
  const accentStyles: Record<string, string> = {
    green: '#0d9488',
    olive: '#0d9488',
    bronze: '#f59e0b',
    red: '#ef4444',
  };

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-start p-4 transition-all duration-200 text-left group flex-1 min-w-0 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-subtle)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      aria-label={`${label}: ${value}`}
    >
      {/* Header with label and icon */}
      <div className="flex items-start justify-between w-full mb-2">
        <span 
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        <div 
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </div>
      </div>
      
      {/* Value */}
      {isLoading ? (
        <span 
          className="text-2xl font-bold leading-none mb-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          —
        </span>
      ) : (
        <span 
          className="text-2xl font-bold leading-none mb-0.5 tabular-nums"
          style={{ 
            color: 'var(--text-primary)'
          }}
        >
          {value}
        </span>
      )}
      
      {/* Subtext */}
      <span 
        className="text-[11px] leading-snug"
        style={{ color: 'var(--text-secondary)' }}
      >
        {subtext}
      </span>

      {/* Progress bar (only for Overall Progress) */}
      {showProgress && (
        <div 
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
          style={{ backgroundColor: 'var(--progress-bg)' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${progressValue}%`,
              backgroundColor: accentStyles[accentColor],
            }}
          />
        </div>
      )}
    </button>
  );
}

export function ExecutiveSummaryCard({ snapshotId }: ExecutiveSummaryCardProps) {
  const navigate = useNavigate();
  
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  // Fetch risks independently
  const { data: riskData, isLoading: risksLoading } = useQuery<RiskData>({
    queryKey: ['executive-risks', snapshotId],
    queryFn: async () => {
      const { data: risks } = await supabase
        .from('risks')
        .select('impact, status')
        .not('status', 'eq', 'Closed');

      const riskList = risks || [];
      const getSeverity = (r: { impact?: string | null }) => {
        const impact = (r.impact || '').toLowerCase();
        if (impact === 'critical' || impact === 'high' || impact === '5' || impact === '4') return 'high';
        if (impact === 'medium' || impact === '3') return 'medium';
        return 'low';
      };

      const high = riskList.filter(r => getSeverity(r) === 'high').length;
      const medium = riskList.filter(r => getSeverity(r) === 'medium').length;
      const low = riskList.filter(r => getSeverity(r) === 'low').length;
      
      let highestSeverity: string | null = null;
      if (high > 0) highestSeverity = 'High';
      else if (medium > 0) highestSeverity = 'Medium';
      else if (low > 0) highestSeverity = 'Low';

      return {
        high,
        medium,
        low,
        total: riskList.length,
        highestSeverity,
      };
    },
    enabled: true,
  });

  // Calculate metrics
  const objectivesCount = okrMetrics?.count ?? 0;
  const hasObjectives = objectivesCount > 0;
  const overallProgress = hasObjectives ? (okrMetrics?.avgProgress ?? 0) : null;
  
  // At risk: objectives with poor/at_risk health
  const atRiskCount = hasObjectives 
    ? (okrMetrics?.objectives?.filter(obj => {
        const health = (obj.health || '').toLowerCase();
        return health === 'at_risk' || health === 'poor';
      }).length ?? 0)
    : 0;

  // Alignment gaps: misaligned epics + misaligned features
  const misalignedEpics = counts?.misalignedEpics ?? 0;
  const misalignedFeatures = counts?.misalignedFeatures ?? 0;
  const alignmentGaps = misalignedEpics + misalignedFeatures;
  const hasAlignmentData = (counts?.epics ?? 0) > 0 || (counts?.features ?? 0) > 0;

  // Risk exposure
  const openRisks = riskData?.total ?? 0;

  // Card A: Overall Progress
  const progressValue = hasObjectives ? `${Math.round(overallProgress!)}%` : '—';
  const progressSubtext = hasObjectives 
    ? `Across ${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''}` 
    : 'Create objectives to start tracking';
  const progressColor = 'green';

  // Card B: At Risk
  const atRiskSubtext = !hasObjectives 
    ? 'No objectives yet' 
    : (atRiskCount > 0 ? 'Objectives need attention' : 'All objectives healthy');

  // Card C: Alignment Gaps
  const gapValue = hasAlignmentData ? alignmentGaps : '—';
  const gapSubtext = !hasAlignmentData 
    ? 'Setup required' 
    : (alignmentGaps > 0 ? 'Unaligned items' : 'All items aligned');

  // Card D: Risk Exposure
  const riskSubtext = openRisks > 0 ? 'Open risks to mitigate' : 'No open risks';

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header with section title pattern */}
      <div 
        className="px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2 
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Executive Summary
        </h2>
        <p 
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          Key performance indicators at a glance
        </p>
      </div>

      {/* KPI Grid — Reduced padding for density */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Progress - Green */}
          <KPITile
            label="Overall Progress"
            value={progressValue}
            subtext={progressSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            accentColor={progressColor}
            iconBgColor="var(--status-success-bg)"
            icon={<BarChart3 size={16} style={{ color: 'var(--status-success)' }} />}
            showProgress={hasObjectives}
            progressValue={overallProgress ?? 0}
          />
          {/* At Risk - Bronze */}
          <KPITile
            label="At Risk"
            value={atRiskCount}
            subtext={atRiskSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
accentColor="bronze"
            iconBgColor="rgba(245, 158, 11, 0.1)"
            icon={<AlertTriangle size={16} style={{ color: '#f59e0b' }} />}
          />
          {/* Alignment Gaps - Amber */}
          <KPITile
            label="Alignment Gaps"
            value={gapValue}
            subtext={gapSubtext}
            onClick={() => navigate('/enterprise/strategic-backlog')}
            isLoading={countsLoading}
            accentColor="bronze"
            iconBgColor="rgba(245, 158, 11, 0.1)"
            icon={<Target size={16} style={{ color: '#f59e0b' }} />}
          />
          {/* Risk Exposure - Muted Red */}
          <KPITile
            label="Risk Exposure"
            value={openRisks}
            subtext={riskSubtext}
            onClick={() => navigate('/enterprise/risks')}
            isLoading={risksLoading}
            accentColor="red"
            iconBgColor="rgba(184, 92, 92, 0.1)"
            icon={<Shield size={16} style={{ color: '#B85C5C' }} />}
          />
        </div>
      </div>
    </section>
  );
}
