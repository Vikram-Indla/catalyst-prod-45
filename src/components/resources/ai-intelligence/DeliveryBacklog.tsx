import React from 'react';

export interface BacklogMetrics {
  avgSubtaskDays: number | null;
  avgStoryDays: number | null;
  avgBugDays: number | null;
  pickupSpeedHours: number | null;
}

export interface BacklogHub {
  hub: string;
  openCount: number;
  statuses: string;
  itemTitles: string;
}

const HUB_ICON_STYLES: Record<string, { bg: string; color: string; letter: string }> = {
  IncidentHub: { bg: 'rgba(248,113,113,0.06)', color: '#DC2626', letter: 'I' },
  ProductHub: { bg: '#F0FDFA', color: '#0D9488', letter: 'P' },
  TestHub: { bg: '#F5F3FF', color: '#7C3AED', letter: 'T' },
  ProjectHub: { bg: 'rgba(59,130,246,0.06)', color: '#2563EB', letter: 'J' },
  ReleaseHub: { bg: '#FFFBEB', color: '#D97706', letter: 'R' },
  Other: { bg: '#F4F4F5', color: '#71717A', letter: 'O' },
};

function countColor(n: number): string {
  if (n >= 4) return 'var(--rai-danger)';
  if (n >= 2) return 'var(--rai-warning)';
  return 'var(--rai-ink)';
}

function fmtMetric(val: number | null, unit: string): string {
  if (val == null) return '—';
  return unit === 'h' ? `${Math.round(val)}h` : `${val.toFixed(1)}d`;
}

interface Props {
  metrics: BacklogMetrics;
  hubs: BacklogHub[];
}

export const DeliveryBacklog: React.FC<Props> = ({ metrics, hubs }) => {
  const sorted = [...hubs].sort((a, b) => b.openCount - a.openCount);
  const totalOpen = sorted.reduce((s, h) => s + h.openCount, 0);

  return (
    <div className="rai-section">
      <div className="rai-section-header">
        <span className="rai-section-title">Delivery Backlog</span>
        <span className="rai-ai-badge">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 2 }}>
            <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2Z" fill="currentColor"/>
          </svg>
          AI
        </span>
      </div>

      {/* Metrics strip — Bloomberg 1px gap grid */}
      <div className="rai-metrics-grid" style={{ background: 'var(--rai-border)' }}>
        {[
          { label: 'AVG SUBTASK', value: fmtMetric(metrics.avgSubtaskDays, 'd') },
          { label: 'AVG STORY', value: fmtMetric(metrics.avgStoryDays, 'd') },
          { label: 'AVG BUG', value: fmtMetric(metrics.avgBugDays, 'd') },
          { label: 'PICKUP SPEED', value: fmtMetric(metrics.pickupSpeedHours, 'h') },
        ].map(m => (
          <div key={m.label} className="rai-metric-cell">
            <div className={`rai-metric-value ${m.value === '—' ? 'rai-empty' : ''}`}>{m.value}</div>
            <div className="rai-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Per-hub backlog list */}
      <div style={{ border: '1px solid var(--rai-border)', borderRadius: 8, marginTop: 16, overflow: 'hidden' }}>
        {sorted.length === 0 && (
          <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--rai-ink-muted)', fontStyle: 'italic' }}>
            No open items in backlog
          </div>
        )}
        {sorted.map(h => {
          const icon = HUB_ICON_STYLES[h.hub] || HUB_ICON_STYLES.Other;
          return (
            <div key={h.hub} className="rai-backlog-item">
              <div className="rai-backlog-icon" style={{ background: icon.bg, color: icon.color }}>
                {icon.letter}
              </div>
              <div className="rai-backlog-body">
                <div className="rai-backlog-hub-name">{h.hub}</div>
                <div className="rai-backlog-detail">{h.statuses}</div>
                <div className="rai-backlog-progress">
                  <div style={{ height: '100%', width: '0%', background: 'var(--rai-primary)', borderRadius: 2 }} />
                </div>
              </div>
              <div className="rai-backlog-count">
                <div className="rai-backlog-count-value" style={{ color: countColor(h.openCount) }}>{h.openCount}</div>
                <div className="rai-backlog-count-label">OPEN</div>
              </div>
            </div>
          );
        })}

        {/* Summary footer */}
        <div style={{
          background: 'var(--rai-surface-secondary)',
          borderTop: '2px solid var(--rai-border)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rai-ink-tertiary)' }}>
            Total Not Done Across All Hubs
          </span>
          <span style={{
            fontFamily: 'var(--rai-font-heading)', fontSize: 16, fontWeight: 700,
            color: totalOpen >= 1 ? 'var(--rai-danger)' : 'var(--rai-ink-muted)',
          }}>
            {totalOpen}
          </span>
        </div>
      </div>
    </div>
  );
};
