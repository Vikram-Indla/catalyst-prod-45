import React from 'react';

export interface HubClosureData {
  hub: string;
  closed: number;
  total: number;
  pct: number;
}

const HUB_ICON_STYLES: Record<string, { bg: string; color: string; letter: string }> = {
  IncidentHub: { bg: 'rgba(248,113,113,0.06)', color: '#DC2626', letter: 'I' },
  ProductHub: { bg: '#F0FDFA', color: '#0D9488', letter: 'P' },
  TestHub: { bg: '#F5F3FF', color: '#7C3AED', letter: 'T' },
  ProjectHub: { bg: 'rgba(59,130,246,0.06)', color: '#2563EB', letter: 'J' },
  ReleaseHub: { bg: '#FFFBEB', color: '#D97706', letter: 'R' },
  Other: { bg: '#F4F4F5', color: '#71717A', letter: 'O' },
};

function getPctColor(pct: number): string {
  if (pct >= 70) return 'var(--rai-success)';
  if (pct >= 40) return 'var(--rai-warning)';
  return 'var(--rai-ink-muted)';
}

interface Props {
  data: HubClosureData[];
}

export const HubClosures: React.FC<Props> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.pct - a.pct);
  const totalClosed = sorted.reduce((s, h) => s + h.closed, 0);
  const totalAll = sorted.reduce((s, h) => s + h.total, 0);
  const totalPct = totalAll > 0 ? Math.round((totalClosed / totalAll) * 100) : 0;

  return (
    <div className="rai-section">
      <div className="rai-section-header">
        <span className="rai-section-title">Hub Closures</span>
        <span className="rai-ai-badge">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 2 }}>
            <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2Z" fill="currentColor"/>
          </svg>
          AI
        </span>
      </div>
      <div style={{ border: '1px solid var(--rai-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table className="rai-table" style={{ border: 'none' }}>
          <thead>
            <tr>
              <th>Hub</th>
              <th>Closed</th>
              <th>Total</th>
              <th>Closure %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const icon = HUB_ICON_STYLES[h.hub] || HUB_ICON_STYLES.Other;
              const color = getPctColor(h.pct);
              return (
                <tr key={h.hub}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="rai-hub-icon" style={{ background: icon.bg, color: icon.color }}>
                        {icon.letter}
                      </div>
                      <span>{h.hub}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--rai-font-heading)', fontSize: 15, fontWeight: 700, color }}>{h.closed}</td>
                  <td style={{ fontFamily: 'var(--rai-font-heading)', fontSize: 15, fontWeight: 700 }}>{h.total}</td>
                  <td>
                    <div className="rai-minibar">
                      <div className="rai-minibar-track">
                        <div className="rai-minibar-fill" style={{ width: `${h.pct}%`, background: color }} />
                      </div>
                      <span className="rai-minibar-pct" style={{ color }}>{h.pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="rai-total-row">
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="rai-hub-icon" style={{ background: '#F4F4F5', color: '#3F3F46', fontFamily: 'var(--rai-font-heading)' }}>Σ</div>
                  <span>All Hubs</span>
                </div>
              </td>
              <td style={{ fontFamily: 'var(--rai-font-heading)', fontSize: 15, fontWeight: 700, color: getPctColor(totalPct) }}>{totalClosed}</td>
              <td style={{ fontFamily: 'var(--rai-font-heading)', fontSize: 15, fontWeight: 700 }}>{totalAll}</td>
              <td>
                <div className="rai-minibar">
                  <div className="rai-minibar-track">
                    <div className="rai-minibar-fill" style={{ width: `${totalPct}%`, background: getPctColor(totalPct) }} />
                  </div>
                  <span className="rai-minibar-pct" style={{ color: getPctColor(totalPct) }}>{totalPct}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
