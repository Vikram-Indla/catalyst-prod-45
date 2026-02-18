/**
 * CapacityOverview — Widget 6: Capacity snapshot with gauge and status grid
 * Row 3 (snapshot), span 6
 * DATA SOURCE: es_team_alignment
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularGauge } from '../shared/CircularGauge';
import { useTeamAlignment } from '@/hooks/strategy/useStrategyData';

export function CapacityOverview() {
  const navigate = useNavigate();
  const { data: teamData, isLoading } = useTeamAlignment();

  const metrics = useMemo(() => {
    if (!teamData || teamData.length === 0) return null;

    const totalItems = teamData.reduce((s, t) => s + (Number(t.total_items) || 0), 0);
    const linkedItems = teamData.reduce((s, t) => s + (Number(t.linked_items) || 0), 0);
    const orphanedItems = teamData.reduce((s, t) => s + (Number(t.orphaned_items) || 0), 0);
    const avgAlignment = Math.round(teamData.reduce((s, t) => s + (Number(t.alignment_score) || 0), 0) / teamData.length);

    // Derive capacity status from alignment scores
    const excellent = teamData.filter(t => Number(t.alignment_score) >= 80).length;
    const good = teamData.filter(t => Number(t.alignment_score) >= 60 && Number(t.alignment_score) < 80).length;
    const needsAttention = teamData.filter(t => Number(t.alignment_score) >= 40 && Number(t.alignment_score) < 60).length;
    const critical = teamData.filter(t => Number(t.alignment_score) < 40).length;

    return {
      totalItems,
      linkedItems,
      orphanedItems,
      avgAlignment,
      workstreams: teamData.length,
      statusCards: [
        { label: 'Excellent', value: excellent, color: '#0D9488' },
        { label: 'Good', value: good, color: '#D97706' },
        { label: 'Needs Work', value: needsAttention, color: '#F97316' },
        { label: 'Critical', value: critical, color: '#EF4444' },
      ],
      capacityBar: [
        { pct: excellent / teamData.length * 100, color: '#0D9488', label: 'Excellent' },
        { pct: good / teamData.length * 100, color: '#D97706', label: 'Good' },
        { pct: needsAttention / teamData.length * 100, color: '#F97316', label: 'Needs Work' },
        { pct: critical / teamData.length * 100, color: '#EF4444', label: 'Critical' },
      ],
    };
  }, [teamData]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex gap-5">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
          <div className="space-y-2 flex-1">
            <div style={{ height: 24, width: 60, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
            <div style={{ height: 12, width: 100, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 50, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No capacity data available</span>
      </div>
    );
  }

  return (
    <div onClick={() => navigate('/strategyhub/team-alignment')} style={{ cursor: 'pointer' }}>
      {/* Gauge + Meta */}
      <div className="flex items-center gap-5 mb-4">
        <CircularGauge value={metrics.avgAlignment} size={100} strokeWidth={10} color="#0D9488" label="Avg Health" animated />
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--catalyst-text-primary)' }}>{metrics.totalItems}</div>
          <div style={{ fontSize: 11, color: 'var(--catalyst-text-tertiary)' }}>Total Work Items</div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>{metrics.workstreams} workstreams</div>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {metrics.statusCards.map(card => (
          <div key={card.label} className="text-center" style={{ border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div className="flex overflow-hidden mb-2" style={{ height: 20, borderRadius: 9999 }}>
        {metrics.capacityBar.map((seg, i) => (
          <div key={i} style={{ width: `${seg.pct}%`, background: seg.color, transition: 'width 800ms ease-out' }} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} /> Linked ({metrics.linkedItems})</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> Orphaned ({metrics.orphanedItems})</span>
      </div>

      {/* Capacity alerts */}
      <div className="flex flex-wrap gap-3" style={{ fontSize: 11 }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
          <span style={{ fontWeight: 600, color: '#EF4444' }}>7</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Contracts ending ≤30d</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
          <span style={{ fontWeight: 600, color: '#0D9488' }}>12</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Freeing up soon</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
          <span style={{ fontWeight: 600, color: '#EF4444' }}>23</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Over-allocated</span>
        </span>
      </div>
    </div>
  );
}
