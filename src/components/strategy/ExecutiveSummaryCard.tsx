import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, Link2, ShieldAlert } from 'lucide-react';
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

export function ExecutiveSummaryCard({ snapshotId }: ExecutiveSummaryCardProps) {
  const navigate = useNavigate();
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  // Fetch risks
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

      return {
        high: riskList.filter(r => getSeverity(r) === 'high').length,
        medium: riskList.filter(r => getSeverity(r) === 'medium').length,
        low: riskList.filter(r => getSeverity(r) === 'low').length,
        total: riskList.length,
      };
    },
    enabled: !!snapshotId,
  });

  const isLoading = okrLoading || countsLoading || risksLoading;

  // Calculate metrics
  const overallProgress = okrMetrics?.avgProgress || 0;
  const objectivesCount = okrMetrics?.count || 0;
  
  // At risk: objectives with poor/at_risk health OR low progress
  const atRiskCount = okrMetrics?.objectives.filter(obj => {
    const health = (obj.health || '').toLowerCase();
    return health === 'at_risk' || health === 'poor' || obj.overall_progress < 30;
  }).length || 0;

  // Alignment gaps
  const misalignedEpics = counts?.misalignedEpics || 0;
  const misalignedFeatures = counts?.misalignedFeatures || 0;
  const alignmentGaps = misalignedEpics + misalignedFeatures;

  // Risk exposure
  const openRisks = riskData?.total || 0;
  const highRisks = riskData?.high || 0;

  const KPITile = ({
    icon: Icon,
    iconColor,
    iconBg,
    label,
    value,
    subtext,
    onClick,
    valueColor,
  }: {
    icon: typeof TrendingUp;
    iconColor: string;
    iconBg: string;
    label: string;
    value: number | string;
    subtext: string;
    onClick: () => void;
    valueColor?: string;
  }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-3 rounded-lg transition-colors text-left hover:bg-[var(--surface-2)] group"
      style={{ borderRight: '1px solid var(--divider)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-7 h-7 rounded flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
          {label}
        </span>
      </div>
      <span 
        className="text-[28px] font-bold leading-none mb-1"
        style={{ color: valueColor || 'var(--text-1)' }}
      >
        {typeof value === 'number' && label === 'Overall Progress' ? `${value}%` : value}
      </span>
      <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
        {subtext}
      </span>
    </button>
  );

  if (isLoading) {
    return (
      <PremiumCard>
        <PremiumCardHeader title="Executive Summary" />
        <PremiumCardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <PremiumCardHeader title="Executive Summary" subtitle="Key metrics at a glance" />
      <PremiumCardContent noPadding>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <KPITile
            icon={TrendingUp}
            iconColor="hsl(var(--secondary-green))"
            iconBg="hsl(var(--secondary-green) / 0.1)"
            label="Overall Progress"
            value={overallProgress}
            subtext={`Across ${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''}`}
            onClick={() => navigate('/enterprise/okr-hub')}
            valueColor={overallProgress >= 70 ? 'hsl(var(--secondary-green))' : overallProgress >= 40 ? 'hsl(var(--brand-gold))' : 'hsl(var(--destructive))'}
          />
          <KPITile
            icon={AlertTriangle}
            iconColor="hsl(var(--brand-gold))"
            iconBg="hsl(var(--brand-gold) / 0.1)"
            label="At Risk"
            value={atRiskCount}
            subtext="Needs attention"
            onClick={() => navigate('/enterprise/okr-hub')}
            valueColor={atRiskCount > 0 ? 'hsl(var(--brand-gold))' : 'var(--text-1)'}
          />
          <KPITile
            icon={Link2}
            iconColor={alignmentGaps > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--secondary-green))'}
            iconBg={alignmentGaps > 0 ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--secondary-green) / 0.1)'}
            label="Alignment Gaps"
            value={alignmentGaps}
            subtext="Misaligned or not linked"
            onClick={() => navigate('/enterprise/strategic-backlog')}
            valueColor={alignmentGaps > 0 ? 'hsl(var(--destructive))' : 'var(--text-1)'}
          />
          <div className="flex flex-col items-start p-3 rounded-lg transition-colors text-left hover:bg-[var(--surface-2)] group cursor-pointer"
            onClick={() => navigate('/enterprise/risks')}
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-7 h-7 rounded flex items-center justify-center"
                style={{ backgroundColor: openRisks > 0 ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--secondary-green) / 0.1)' }}
              >
                <ShieldAlert className="w-3.5 h-3.5" style={{ color: openRisks > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--secondary-green))' }} />
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                Risk Exposure
              </span>
            </div>
            <span 
              className="text-[28px] font-bold leading-none mb-1"
              style={{ color: openRisks > 0 ? 'hsl(var(--destructive))' : 'var(--text-1)' }}
            >
              {openRisks}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              {highRisks > 0 ? `High: ${highRisks} · ` : ''}Open risks
            </span>
          </div>
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
