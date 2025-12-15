import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, GitBranch, ShieldAlert } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { supabase } from '@/integrations/supabase/client';

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
  accentColor: 'green' | 'gold' | 'bronze' | 'red' | 'neutral';
}

function KPITile({ 
  label, 
  value, 
  subtext, 
  onClick, 
  isLoading = false,
  accentColor,
}: KPITileProps) {
  const accentStyles: Record<string, string> = {
    green: 'hsl(var(--secondary-green))',
    gold: 'hsl(var(--brand-gold))',
    bronze: 'hsl(var(--secondary-bronze))',
    red: 'hsl(var(--destructive))',
    neutral: 'var(--text-3)',
  };
  
  const accentBorder = accentStyles[accentColor];
  const isNeutral = accentColor === 'neutral';

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-start p-4 transition-colors text-left hover:bg-[var(--surface-2)] group flex-1 border-r last:border-r-0"
      style={{ borderColor: 'var(--divider)' }}
    >
      {/* Top accent bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentBorder }}
      />
      
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-2)' }}
      >
        {label}
      </span>
      
      {isLoading ? (
        <div className="h-9 w-14 rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--surface-3)' }} />
      ) : (
        <span 
          className="text-[32px] font-bold leading-none mb-1 tabular-nums"
          style={{ color: isNeutral ? 'var(--text-2)' : accentBorder }}
        >
          {value}
        </span>
      )}
      
      <span 
        className="text-[12px] leading-snug"
        style={{ color: 'var(--text-3)' }}
      >
        {subtext}
      </span>
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
  const highestSeverity = riskData?.highestSeverity;

  // Card A: Overall Progress
  const progressValue = hasObjectives ? `${Math.round(overallProgress!)}%` : 'N/A';
  const progressSubtext = hasObjectives 
    ? `Across ${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''}` 
    : 'Create objectives to start tracking';
  const progressColor = hasObjectives 
    ? (overallProgress! >= 70 ? 'green' : overallProgress! >= 40 ? 'gold' : 'neutral') 
    : 'neutral';

  // Card B: At Risk
  const atRiskSubtext = !hasObjectives 
    ? 'No objectives yet' 
    : (atRiskCount > 0 ? 'Needs attention' : 'All objectives healthy');
  const atRiskColor = atRiskCount > 0 ? 'bronze' : 'neutral';

  // Card C: Alignment Gaps
  const gapValue = hasAlignmentData ? alignmentGaps : '—';
  const gapSubtext = !hasAlignmentData 
    ? 'Setup required' 
    : (alignmentGaps > 0 ? 'Items missing upstream link' : 'All items aligned');
  const gapColor = alignmentGaps > 0 ? 'bronze' : (hasAlignmentData ? 'green' : 'neutral');

  // Card D: Risk Exposure
  const riskSubtext = highestSeverity 
    ? `Highest: ${highestSeverity}` 
    : (openRisks > 0 ? 'Open risks' : 'No open risks');
  const riskColor = openRisks > 0 ? (riskData?.high ?? 0) > 0 ? 'red' : 'bronze' : 'green';

  return (
    <PremiumCard>
      <PremiumCardHeader 
        title="Executive Summary" 
        subtitle="Key performance indicators at a glance" 
      />
      <PremiumCardContent noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <KPITile
            label="Overall Progress"
            value={progressValue}
            subtext={progressSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            accentColor={progressColor}
          />
          <KPITile
            label="At Risk"
            value={atRiskCount}
            subtext={atRiskSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            accentColor={atRiskColor}
          />
          <KPITile
            label="Alignment Gaps"
            value={gapValue}
            subtext={gapSubtext}
            onClick={() => navigate('/enterprise/strategic-backlog')}
            isLoading={countsLoading}
            accentColor={gapColor}
          />
          <KPITile
            label="Risk Exposure"
            value={openRisks}
            subtext={riskSubtext}
            onClick={() => navigate('/enterprise/risks')}
            isLoading={risksLoading}
            accentColor={riskColor}
          />
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
