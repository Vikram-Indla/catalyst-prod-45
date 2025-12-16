import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, AlertTriangle, Info, Shield } from 'lucide-react';

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
  accentColor: 'green' | 'gold' | 'bronze' | 'neutral';
  icon: React.ReactNode;
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
  showProgress = false,
  progressValue = 0,
}: KPITileProps) {
  const accentStyles: Record<string, string> = {
    green: 'hsl(var(--secondary-green))',
    gold: 'hsl(var(--brand-gold))',
    bronze: 'hsl(var(--secondary-bronze))',
    neutral: 'var(--text-2)',
  };
  
  const progressColors: Record<string, string> = {
    green: 'hsl(var(--secondary-green))',
    gold: 'hsl(var(--brand-gold))',
    bronze: 'hsl(var(--secondary-bronze))',
    neutral: 'var(--text-3)',
  };

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-start p-5 transition-all duration-200 text-left group flex-1 min-w-0 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--divider-subtle)',
        borderRadius: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider-subtle)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      aria-label={`${label}: ${value}`}
    >
      {/* Top accent bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"
        style={{ backgroundColor: accentStyles[accentColor] }}
      />
      
      {/* Header with label and icon */}
      <div className="flex items-start justify-between w-full mb-3">
        <span 
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-2)' }}
        >
          {label}
        </span>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ 
            backgroundColor: 'hsl(var(--brand-gold) / 0.1)',
          }}
        >
          {icon}
        </div>
      </div>
      
      {/* Value */}
      {isLoading ? (
        <span 
          className="text-[32px] font-bold leading-none mb-1"
          style={{ color: 'var(--text-3)' }}
        >
          —
        </span>
      ) : (
        <span 
          className="text-[32px] font-bold leading-none mb-1 tabular-nums"
          style={{ color: 'var(--text-1)' }}
        >
          {value}
        </span>
      )}
      
      {/* Subtext */}
      <span 
        className="text-[12px] leading-snug"
        style={{ color: 'var(--text-2)' }}
      >
        {subtext}
      </span>

      {/* Progress bar (only for Overall Progress) */}
      {showProgress && (
        <div 
          className="w-full h-1 rounded-full mt-3 overflow-hidden"
          style={{ backgroundColor: 'var(--surface-3)' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${progressValue}%`,
              backgroundColor: progressColors[accentColor],
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
  const progressColor = hasObjectives 
    ? (overallProgress! >= 70 ? 'green' : 'gold') 
    : 'neutral';

  // Card B: At Risk
  const atRiskSubtext = !hasObjectives 
    ? 'No objectives yet' 
    : (atRiskCount > 0 ? 'Objective behind schedule' : 'All objectives healthy');
  const atRiskColor = atRiskCount > 0 ? 'gold' : 'neutral';

  // Card C: Alignment Gaps
  const gapValue = hasAlignmentData ? alignmentGaps : '—';
  const gapSubtext = !hasAlignmentData 
    ? 'Setup required' 
    : (alignmentGaps > 0 ? 'Items need attention' : 'All items aligned');
  const gapColor = alignmentGaps > 0 ? 'bronze' : 'neutral';

  // Card D: Risk Exposure
  const riskSubtext = openRisks > 0 ? 'Open risks identified' : 'No open risks';
  const riskColor = openRisks > 0 ? 'bronze' : 'neutral';

  return (
    <section 
      className="rounded-[10px] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--divider)',
        borderLeft: '3px solid hsl(var(--brand-gold))',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <h2 
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-1)' }}
        >
          Executive Summary
        </h2>
        <p 
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-2)' }}
        >
          Key performance indicators at a glance
        </p>
      </div>

      {/* KPI Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPITile
            label="Overall Progress"
            value={progressValue}
            subtext={progressSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            accentColor={progressColor}
            icon={<BarChart3 className="w-[18px] h-[18px]" style={{ color: 'hsl(var(--brand-gold))' }} />}
            showProgress={hasObjectives}
            progressValue={overallProgress ?? 0}
          />
          <KPITile
            label="At Risk"
            value={atRiskCount}
            subtext={atRiskSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            accentColor={atRiskColor}
            icon={<AlertTriangle className="w-[18px] h-[18px]" style={{ color: 'hsl(var(--brand-gold))' }} />}
          />
          <KPITile
            label="Alignment Gaps"
            value={gapValue}
            subtext={gapSubtext}
            onClick={() => navigate('/enterprise/strategic-backlog')}
            isLoading={countsLoading}
            accentColor={gapColor}
            icon={<Info className="w-[18px] h-[18px]" style={{ color: 'hsl(var(--brand-gold))' }} />}
          />
          <KPITile
            label="Risk Exposure"
            value={openRisks}
            subtext={riskSubtext}
            onClick={() => navigate('/enterprise/risks')}
            isLoading={risksLoading}
            accentColor={riskColor}
            icon={<Shield className="w-[18px] h-[18px]" style={{ color: 'hsl(var(--brand-gold))' }} />}
          />
        </div>
      </div>
    </section>
  );
}
