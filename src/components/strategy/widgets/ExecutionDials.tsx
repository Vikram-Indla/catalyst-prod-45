/**
 * ExecutionDials — Widget 4: 4 donut gauges for work item completion
 * Row 2, span 6
 * DATA SOURCE: es_dashboard_execution_dials view (falls back to direct counts)
 */

import { useMemo } from 'react';
import { CircularGauge } from '../shared/CircularGauge';
import { useExecutionDials, useGoals, useKeyResults, useStrategicThemes, useEsInitiatives } from '@/hooks/strategy/useStrategyData';

interface DialData {
  label: string;
  completed: number;
  total: number;
  color: string;
}

const LABEL_MAP: Record<string, string> = {
  'Business Requests': 'Initiatives',
};

export function ExecutionDials() {
  const { data: viewData, isLoading: viewLoading } = useExecutionDials();
  const { data: themes, isLoading: tL } = useStrategicThemes();
  const { data: goals, isLoading: gL } = useGoals();
  const { data: krs, isLoading: kL } = useKeyResults();
  const { data: initiatives, isLoading: iL } = useEsInitiatives();

  const isLoading = viewLoading && tL && gL && kL && iL;

  const dials: DialData[] = useMemo(() => {
    // If the view has data, use it
    if (viewData && viewData.length > 0) {
      return viewData.map(d => ({
        label: LABEL_MAP[d.link_type as string] || (d.link_type as string) || 'Unknown',
        completed: Number(d.completed_items) || 0,
        total: Number(d.total_items) || 0,
        color: '#2563EB',
      }));
    }

    // Fallback: compute from actual data
    const completedGoals = goals?.filter(g => g.status === 'on_track' || g.status === 'completed').length || 0;
    const completedKrs = krs?.filter(kr => Number(kr.progress_pct) >= 70).length || 0;
    const completedInit = initiatives?.filter(i => i.status === 'completed' || i.status === 'in_progress').length || 0;

    return [
      { label: 'Initiatives', completed: completedInit, total: initiatives?.length || 0, color: '#2563EB' },
      { label: 'Themes', completed: themes?.filter(t => t.status === 'active').length || 0, total: themes?.length || 0, color: '#D97706' },
      { label: 'Goals', completed: completedGoals, total: goals?.length || 0, color: '#0D9488' },
      { label: 'Key Results', completed: completedKrs, total: krs?.length || 0, color: '#0D9488' },
    ];
  }, [viewData, themes, goals, krs, initiatives]);

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
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
    >
      {dials.map(dial => {
        const pct = dial.total > 0 ? Math.round((dial.completed / dial.total) * 100) : 0;
        return (
          <div key={dial.label} className="flex flex-col items-center">
            <div style={{ opacity: 0.9 }}>
              <CircularGauge
                value={pct}
                size={100}
                strokeWidth={8}
                color={dial.color}
                animated
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', marginTop: 6, textAlign: 'center' }}>
              {dial.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>
              {dial.completed} / {dial.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
