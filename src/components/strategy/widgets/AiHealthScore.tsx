/**
 * AiHealthScore — Widget 7: AI health ring + per-widget factor breakdown + narrative
 * Row 4, span 3
 * DATA SOURCE: es_health_scores + computed from other widgets
 */

import { useMemo } from 'react';
import { Sparkles, Target, Gauge, DollarSign, Users, Shield } from 'lucide-react';
import { CircularGauge } from '../shared/CircularGauge';
import { useHealthScore } from '@/hooks/strategy/useStrategyData';
import { useGoals, useKeyResults, useEsInitiatives } from '@/hooks/strategy/useStrategyData';
import { useBudgetLive, useCapacityLive } from '@/hooks/strategy/useBudgetCapacityLive';
import { useRisks } from '@/hooks/risks/useRisks';

function getStatusLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: '#0D9488' };
  if (score >= 70) return { label: 'Good', color: '#7C3AED' };
  if (score >= 50) return { label: 'At Risk', color: '#D97706' };
  return { label: 'Critical', color: '#EF4444' };
}

function getFactorColor(score: number): string {
  if (score >= 70) return '#16A34A';
  if (score >= 40) return '#D97706';
  return '#EF4444';
}

const FACTOR_ICONS: Record<string, React.ElementType> = {
  'OKR Progress': Target,
  'Execution': Gauge,
  'Budget Health': DollarSign,
  'Workforce': Users,
  'Risk Posture': Shield,
};

export function AiHealthScore() {
  const { data: health, isLoading: hL } = useHealthScore();
  const { data: goals, isLoading: gL } = useGoals();
  const { data: keyResults, isLoading: kL } = useKeyResults();
  const { data: initiatives, isLoading: iL } = useEsInitiatives();
  const { data: budgetData, isLoading: bL } = useBudgetLive();
  const { data: capacityData, isLoading: cL } = useCapacityLive();
  const { risks, isLoading: rL } = useRisks();

  const isLoading = hL || gL || kL || iL || bL || cL || rL;

  const factors = useMemo(() => {
    const okrScore = goals?.length
      ? Math.round(goals.reduce((s, g) => s + (Number(g.progress_pct) || 0), 0) / goals.length)
      : 0;

    const initCount = initiatives?.length || 0;
    const krCount = keyResults?.length || 0;
    const totalExec = initCount + krCount;
    const execScore = totalExec > 0
      ? Math.round(
          ((initiatives?.reduce((s, i) => s + (Number(i.progress_pct) || 0), 0) || 0) +
           (keyResults?.reduce((s, kr) => s + (Number(kr.progress_pct) || 0), 0) || 0)) / totalExec
        )
      : 0;

    const budgetScore = budgetData?.dataQualityPct || 0;

    const totalResources = capacityData?.totalHeadcount || 1;
    const committed = capacityData?.atCapacity || 0;
    const workforceScore = Math.round((committed / totalResources) * 100);

    const openRisks = (risks || []).filter(r => r.status === 'Open');
    const criticalRisks = openRisks.filter(r => r.impact === 'Critical' || r.impact === 'High').length;
    const overdueRisks = openRisks.filter(r => r.target_resolution_date && new Date(r.target_resolution_date) < new Date()).length;
    const riskScore = Math.max(0, 100 - (criticalRisks * 10) - (overdueRisks * 5));

    return [
      { name: 'OKR Progress', score: okrScore, source: 'OKR Tree & Heatmap' },
      { name: 'Execution', score: execScore, source: 'Execution Dials' },
      { name: 'Budget Health', score: budgetScore, source: 'Budget Overview' },
      { name: 'Workforce', score: workforceScore, source: 'Workforce Overview' },
      { name: 'Risk Posture', score: riskScore, source: 'Risk Radar' },
    ];
  }, [goals, keyResults, initiatives, budgetData, capacityData, risks]);

  const compositeScore = useMemo(() =>
    factors.length > 0 ? Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length) : 0,
    [factors]
  );

  const narrative = useMemo(() => {
    if (factors.length === 0) return [];
    const weakest = factors.reduce((min, f) => f.score < min.score ? f : min);
    const strongest = factors.reduce((max, f) => f.score > max.score ? f : max);
    const lines: string[] = [];

    if (compositeScore >= 70) {
      lines.push(`Strategy execution is on track at ${compositeScore}%.`);
    } else if (compositeScore >= 50) {
      lines.push(`Strategy health requires attention at ${compositeScore}%.`);
    } else {
      lines.push(`Strategy health is critical at ${compositeScore}%. Immediate action needed.`);
    }

    lines.push(`${weakest.name} is the weakest area at ${weakest.score}% — focus on ${weakest.source}.`);

    if (strongest.score >= 80) {
      lines.push(`${strongest.name} is strong at ${strongest.score}%.`);
    }

    return lines;
  }, [factors, compositeScore]);

  const status = getStatusLabel(compositeScore);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center animate-pulse">
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
        <div className="mt-3" style={{ width: 60, height: 16, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
        <div className="w-full mt-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 14, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <CircularGauge value={compositeScore} size={100} strokeWidth={10} color="#7C3AED" label="/ 100" animated />

      {/* Status badge */}
      <span className="mt-2 mb-3" style={{
        fontSize: 11, fontWeight: 600, color: status.color,
        background: `${status.color}1A`, borderRadius: 9999, padding: '2px 10px',
      }}>
        ● {status.label}
      </span>

      {/* B) Factor Breakdown */}
      <div className="w-full space-y-1.5 mb-3">
        {factors.map(factor => {
          const Icon = FACTOR_ICONS[factor.name] || Target;
          const color = getFactorColor(factor.score);
          return (
            <div key={factor.name} className="flex items-center gap-2">
              <span style={{ width: 70, fontSize: 10, color: 'var(--catalyst-text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                {factor.name}
              </span>
              <div className="flex-1" style={{ height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(factor.score, 100)}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: color,
                  transition: 'width 600ms ease-out',
                }} />
              </div>
              <span style={{ width: 28, fontSize: 10, fontWeight: 700, color, textAlign: 'right', flexShrink: 0 }}>
                {factor.score}%
              </span>
            </div>
          );
        })}
      </div>

      {/* C) AI Narrative */}
      <div className="w-full space-y-1">
        {narrative.map((line, i) => (
          <div key={i} className="flex gap-1.5" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)', lineHeight: 1.4 }}>
            <Sparkles size={8} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 3 }} />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
