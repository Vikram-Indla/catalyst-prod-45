import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, Link2, ShieldAlert, AlertCircle } from 'lucide-react';
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
}

interface KPITileProps {
  icon: typeof TrendingUp;
  label: string;
  value: number | string;
  subtext: string;
  onClick: () => void;
  isNeutral?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  accentColor?: 'green' | 'gold' | 'red' | 'neutral';
}

function KPITile({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  onClick, 
  isNeutral = false, 
  isLoading = false,
  hasError = false,
  accentColor = 'neutral'
}: KPITileProps) {
  const colorMap = {
    green: { icon: 'hsl(var(--secondary-green))', bg: 'hsl(var(--secondary-green) / 0.1)' },
    gold: { icon: 'hsl(var(--brand-gold))', bg: 'hsl(var(--brand-gold) / 0.1)' },
    red: { icon: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.1)' },
    neutral: { icon: 'var(--text-3)', bg: 'var(--surface-3)' },
  };
  
  const colors = colorMap[isNeutral ? 'neutral' : accentColor];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-4 rounded-lg transition-colors text-left hover:bg-[var(--surface-2)] group flex-1 border-r border-border/40 last:border-r-0"
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-7 h-7 rounded flex items-center justify-center"
          style={{ backgroundColor: colors.bg }}
        >
          {hasError ? (
            <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
          ) : (
            <Icon className="w-3.5 h-3.5" style={{ color: colors.icon }} />
          )}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {isLoading ? (
        <div className="h-8 w-12 bg-muted/30 rounded animate-pulse mb-1" />
      ) : (
        <span 
          className="text-[28px] font-bold leading-none mb-1"
          style={{ color: isNeutral || hasError ? 'var(--text-2)' : colors.icon }}
        >
          {value}
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {subtext}
      </span>
    </button>
  );
}

export function ExecutiveSummaryCard({ snapshotId }: ExecutiveSummaryCardProps) {
  const navigate = useNavigate();
  
  // Each query runs independently - we don't block on all of them
  const { data: okrMetrics, isLoading: okrLoading, isError: okrError } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading, isError: countsError } = useStrategyPyramidCounts(snapshotId);

  // Fetch risks independently
  const { data: riskData, isLoading: risksLoading, isError: risksError } = useQuery<RiskData>({
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

      return {
        high: riskList.filter(r => getSeverity(r) === 'high').length,
        medium: riskList.filter(r => getSeverity(r) === 'medium').length,
        low: riskList.filter(r => getSeverity(r) === 'low').length,
        total: riskList.length,
      };
    },
    enabled: true, // Always try to fetch risks
  });

  // Calculate metrics - with safe fallbacks
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

  // Alignment gaps - safe access
  const misalignedEpics = counts?.misalignedEpics ?? 0;
  const misalignedFeatures = counts?.misalignedFeatures ?? 0;
  const alignmentGaps = misalignedEpics + misalignedFeatures;

  // Risk exposure - safe access
  const openRisks = riskData?.total ?? 0;
  const highRisks = riskData?.high ?? 0;

  // Determine display values and states for each tile
  const progressValue = okrError ? '—' : (hasObjectives ? `${Math.round(overallProgress!)}%` : 'N/A');
  const progressSubtext = okrError 
    ? 'Unable to load' 
    : (hasObjectives ? `Across ${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''}` : 'Create objectives to start tracking');

  const atRiskValue = okrError ? '—' : atRiskCount;
  const atRiskSubtext = okrError 
    ? 'Unable to load' 
    : (!hasObjectives ? 'No objectives yet' : (atRiskCount > 0 ? 'Needs attention' : 'No items flagged'));

  const alignmentValue = countsError ? '—' : alignmentGaps;
  const alignmentSubtext = countsError 
    ? 'Data source not configured' 
    : (alignmentGaps > 0 ? 'Misaligned or not linked' : 'No gaps detected');

  const riskValue = risksError ? '—' : openRisks;
  const riskSubtext = risksError 
    ? 'Risks module not enabled' 
    : (highRisks > 0 ? `High: ${highRisks} · Open risks` : (openRisks > 0 ? 'Open risks' : 'No open risks'));

  return (
    <PremiumCard>
      <PremiumCardHeader title="Executive Summary" subtitle="Key metrics at a glance" />
      <PremiumCardContent noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <KPITile
            icon={TrendingUp}
            label="Overall Progress"
            value={progressValue}
            subtext={progressSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            hasError={okrError}
            isNeutral={!hasObjectives || okrError}
            accentColor={hasObjectives ? 'green' : 'neutral'}
          />
          <KPITile
            icon={AlertTriangle}
            label="At Risk"
            value={atRiskValue}
            subtext={atRiskSubtext}
            onClick={() => navigate('/enterprise/okr-hub')}
            isLoading={okrLoading}
            hasError={okrError}
            isNeutral={atRiskCount === 0 || okrError || !hasObjectives}
            accentColor={atRiskCount > 0 ? 'gold' : 'neutral'}
          />
          <KPITile
            icon={Link2}
            label="Alignment Gaps"
            value={alignmentValue}
            subtext={alignmentSubtext}
            onClick={() => navigate('/enterprise/strategic-backlog')}
            isLoading={countsLoading}
            hasError={countsError}
            isNeutral={alignmentGaps === 0 || countsError}
            accentColor={alignmentGaps > 0 ? 'gold' : 'green'}
          />
          <KPITile
            icon={ShieldAlert}
            label="Risk Exposure"
            value={riskValue}
            subtext={riskSubtext}
            onClick={() => navigate('/enterprise/risks')}
            isLoading={risksLoading}
            hasError={risksError}
            isNeutral={openRisks === 0 || risksError}
            accentColor={openRisks > 0 ? 'red' : 'green'}
          />
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
