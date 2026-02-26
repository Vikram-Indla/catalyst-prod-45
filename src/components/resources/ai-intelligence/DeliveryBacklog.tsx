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
  IncidentHub: { bg: '#FEF2F2', color: '#DC2626', letter: 'I' },
  ProductHub: { bg: '#F0FDFA', color: '#0D9488', letter: 'P' },
  TestHub: { bg: '#F5F3FF', color: '#7C3AED', letter: 'T' },
  ProjectHub: { bg: '#EFF6FF', color: '#2563EB', letter: 'J' },
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
        <span className="rai-ai-badge">✦ AI</span>
      </div>

      {/* Metrics strip */}
      <div className="rai-metrics-grid">
        {[
          { label: 'Avg Subtask', value: fmtMetric(metrics.avgSubtaskDays, 'd') },
          { label: 'Avg Story', value: fmtMetric(metrics.avgStoryDays, 'd') },
          { label: 'Avg Bug', value: fmtMetric(metrics.avgBugDays, 'd') },
          { label: 'Pickup Speed', value: fmtMetric(metrics.pickupSpeedHours, 'h') },
        ].map(m => (
          <div key={m.label} className="rai-metric-cell">
            <div className={`rai-metric-value ${m.value === '—' ? 'rai-empty' : ''}`}>{m.value}</div>
            <div className="rai-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Per-hub backlog list */}
      <div style={{ border: '1px solid var(--rai-border)', borderRadius: 8, marginTop: 16, overflow: 'hidden' }}>
        {sorted.map(h => {
          const icon = HUB_ICON_STYLES[h.hub] || HUB_ICON_STYLES.Other;
          const doneRatio = 0; // backlog items are all not-done
          return (
            <div key={h.hub} className="rai-backlog-item">
              <div className="rai-backlog-icon" style={{ background: icon.bg, color: icon.color }}>
                {icon.letter}
              </div>
              <div className="rai-backlog-body">
                <div className="rai-backlog-hub-name">{h.hub}</div>
                <div className="rai-backlog-detail">{h.statuses}</div>
                <div className="rai-backlog-progress">
                  <div style={{ height: '100%', width: `${doneRatio}%`, background: 'var(--rai-primary)', borderRadius: 2 }} />
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
            fontFamily: 'var(--rai-font-heading)', fontSize: 18, fontWeight: 700,
            color: totalOpen >= 4 ? 'var(--rai-danger)' : 'var(--rai-warning)',
          }}>
            {totalOpen}
          </span>
        </div>
      </div>
    </div>
  );
};
