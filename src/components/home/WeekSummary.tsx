/**
 * WeekSummary — "Your Week" narrative section.
 */
import React from 'react';
import type { WeekSummary as WeekSummaryType } from './hooks/useWeekSummary';

const F = {
  inter: 'var(--ds-font-family-body)',
  mono: 'var(--ds-font-family-monospaced)',
};

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', ICP: '#722ED1',
  IP: '#13C2C2', IRP: '#EB2F96', MWR: '#FAAD14', TAH: '#1890FF',
};

export function WeekSummarySection({ summary, onItemClick }: { summary: WeekSummaryType; onItemClick: (key: string) => void }) {
  const typeEntries = Object.entries(summary.myClosed.byType);
  const projectEntries = Object.entries(summary.teamClosed.byProject);
  const myClosedText = typeEntries.length > 0
    ? typeEntries.map(([t, c]) => `${c} ${t.toLowerCase()}${c > 1 ? 's' : ''}`).join(', ')
    : 'none';

  return (
    <div style={{ marginBottom: 24 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--fg-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.inter,
      }}>
        YOUR WEEK
      </span>
      <div style={{
        marginTop: 10, padding: '14px 16px',
        border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--cp-float)',
      }}>
        {/* My closures */}
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: '20px', margin: '0 0 10px', fontFamily: F.inter }}>
          {summary.myClosed.total > 0
            ? <>You closed <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{summary.myClosed.total} items</strong> this week — {myClosedText}.</>
            : <>No items closed by you this week yet.</>
          }
        </p>

        {/* Team closures */}
        {summary.teamClosed.total > 0 && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: '20px', margin: 0, fontFamily: F.inter }}>
              Your team shipped <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{summary.teamClosed.total} items</strong> across {projectEntries.length} project{projectEntries.length !== 1 ? 's' : ''}:
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {projectEntries.map(([pk, count]) => (
                <span key={pk} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', fontFamily: F.inter }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: PROJECT_COLORS[pk] || 'var(--fg-3)' }} />
                  {pk} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Aging items */}
        {summary.agingItems.length > 0 && (
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-warning)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sem-warning)', fontFamily: F.inter }}>
                {summary.agingItems.length} items aging over 2 weeks
              </span>
            </div>
            {summary.agingItems.map(item => (
              <button
                key={item.key}
                onClick={() => onItemClick(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '4px 0', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', minWidth: 70 }}>{item.key}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: F.inter, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: 'var(--sem-warning)', flexShrink: 0 }}>{item.days}d</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
