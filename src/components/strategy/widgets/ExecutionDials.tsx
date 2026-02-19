/**
 * ExecutionDials — Widget 4: 4 donut gauges for average progress
 * Row 2, span 6
 * DATA SOURCE: es_initiatives, es_goals, es_key_results
 */

import { useMemo } from 'react';
import { CircularGauge } from '../shared/CircularGauge';
import { useGoals, useKeyResults, useEsInitiatives } from '@/hooks/strategy/useStrategyData';

interface DialData {
  label: string;
  value: number;
  subtitle: string;
  color: string;
}

function getDialColor(v: number): string {
  if (v < 40) return 'var(--exec-signal-red, #DC2626)';
  return 'var(--exec-blue-500, #3B82F6)';
}

export function ExecutionDials() {
  const { data: goals, isLoading: gL } = useGoals();
  const { data: krs, isLoading: kL } = useKeyResults();
  const { data: initiatives, isLoading: iL } = useEsInitiatives();

  const isLoading = gL && kL && iL;

  const dials: DialData[] = useMemo(() => {
    const avgProgress = (items: any[] | undefined, field = 'progress_pct') => {
      if (!items || items.length === 0) return 0;
      return Math.round(items.reduce((sum, i) => sum + (Number(i[field]) || 0), 0) / items.length);
    };

    const initAvg = avgProgress(initiatives);
    const goalAvg = avgProgress(goals);
    const krAvg = avgProgress(krs);
    const totalItems = (initiatives?.length || 0) + (goals?.length || 0) + (krs?.length || 0);
    const overallAvg = totalItems > 0
      ? Math.round(
          ((initiatives?.reduce((s, i) => s + (Number(i.progress_pct) || 0), 0) || 0) +
           (goals?.reduce((s, g) => s + (Number(g.progress_pct) || 0), 0) || 0) +
           (krs?.reduce((s, kr) => s + (Number(kr.progress_pct) || 0), 0) || 0)) / totalItems
        )
      : 0;

    const onTrackGoals = goals?.filter(g => g.status === 'on_track' || g.status === 'completed').length || 0;

    return [
      { label: 'Initiatives', value: initAvg, subtitle: `${initiatives?.length || 0} tracked`, color: getDialColor(initAvg) },
      { label: 'Goals', value: goalAvg, subtitle: `${onTrackGoals}/${goals?.length || 0} on track`, color: getDialColor(goalAvg) },
      { label: 'Key Results', value: krAvg, subtitle: `${krs?.length || 0} measured`, color: getDialColor(krAvg) },
      { label: 'Execution', value: overallAvg, subtitle: 'Overall velocity', color: getDialColor(overallAvg) },
    ];
  }, [goals, krs, initiatives]);

  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center">
            <div className="animate-pulse" style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
            <div className="animate-pulse mt-2" style={{ width: 60, height: 12, borderRadius: 4, background: 'var(--catalyst-bg-hover)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {dials.map(dial => (
        <div key={dial.label} className="flex flex-col items-center">
          <div style={{ opacity: 0.9 }}>
            <CircularGauge value={dial.value} size={100} strokeWidth={8} color={dial.color} animated />
          </div>
          <span style={{ fontSize: 11, color: 'var(--exec-text-secondary)', marginTop: 6, textAlign: 'center' }}>
            {dial.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--exec-text-tertiary)' }}>
            {dial.subtitle}
          </span>
        </div>
      ))}
    </div>
  );
}
