/**
 * TeamSnapshot — Widget 9: 5 stat rows with data from es_team_alignment
 * Row 4, span 3
 * DATA SOURCE: es_team_alignment + es_health_scores
 */

import { useMemo } from 'react';
import { useTeamAlignment, useHealthScore, useGoals } from '@/hooks/strategy/useStrategyData';

interface StatRow {
  label: string;
  value: string;
}

export function TeamSnapshot() {
  const { data: teamData, isLoading: tL } = useTeamAlignment();
  const { data: health, isLoading: hL } = useHealthScore();
  const { data: goals, isLoading: gL } = useGoals();
  const isLoading = tL || hL || gL;

  const stats: StatRow[] = useMemo(() => {
    if (!teamData) return [];

    const totalItems = teamData.reduce((s, t) => s + (Number(t.total_items) || 0), 0);
    const linkedItems = teamData.reduce((s, t) => s + (Number(t.linked_items) || 0), 0);
    const orphaned = teamData.reduce((s, t) => s + (Number(t.orphaned_items) || 0), 0);
    const avgAlignment = teamData.length
      ? Math.round(teamData.reduce((s, t) => s + (Number(t.alignment_score) || 0), 0) / teamData.length)
      : 0;
    // Count at-risk goals as "blockers"
    const blockers = goals?.filter(g => g.status === 'at_risk' || g.status === 'off_track').length || 0;

    return [
      { label: 'Total Work Items', value: String(totalItems) },
      { label: 'Workstreams', value: String(teamData.length) },
      { label: 'Avg. Alignment', value: `${avgAlignment}%` },
      { label: 'At Risk Goals', value: String(blockers) },
      { label: 'Linked / Orphaned', value: `${linkedItems} / ${orphaned}` },
    ];
  }, [teamData, goals]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex justify-between" style={{ padding: '8px 0' }}>
            <div style={{ height: 12, width: 80, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
            <div style={{ height: 14, width: 40, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No team data available</span>
      </div>
    );
  }

  return (
    <div>
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="flex items-center justify-between"
          style={{
            padding: '8px 0',
            borderBottom: i < stats.length - 1 ? '1px solid var(--catalyst-border-default, var(--bd-default, rgba(255,255,255,0.10)))' : 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)' }}>{stat.label}</span>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--catalyst-text-primary)' }}>{stat.value}</span>
            {/* Change indicators require comparing current period to previous period.
                Will be populated when es_snapshots comparison is implemented */}
          </div>
        </div>
      ))}
    </div>
  );
}
