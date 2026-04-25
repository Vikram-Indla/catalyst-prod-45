/**
 * SyncLegend — Legend strip below toolbar
 * C4: Only visible when Jira items shown
 */
import React from 'react';

interface SyncLegendProps {
  visible: boolean;
}

const LEGEND_ITEMS = [
  { color: '#16A34A', label: 'Synced' },
  { color: '#D97706', label: 'Stale (>3 days)' },
  { color: '#DC2626', label: 'Conflict' },
  { color: '#2563EB', label: 'Syncing', pulse: true },
];

export function SyncLegend({ visible }: SyncLegendProps) {
  if (!visible) return null;

  return (
    <div
      className="flex items-center w-full"
      style={{
        backgroundColor: 'var(--cp-bg-sunken, var(--cp-bd-zone))',
        borderBottom: '0.75px solid var(--cp-border-subtle, rgba(15,23,42,0.07))',
        padding: '8px 28px',
        fontFamily: 'var(--cp-font-body)',
        fontSize: 11.5,
        gap: 16,
      }}
    >
      <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>
        Jira sync status:
      </span>
      {LEGEND_ITEMS.map(item => (
        <span key={item.label} className="inline-flex items-center gap-[5px]">
          <span
            className={item.pulse ? 'sync-pulse-dot' : ''}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: item.color,
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--fg-2)' }}>{item.label}</span>
        </span>
      ))}
      <span className="ml-auto" style={{ color: 'var(--fg-4)' }}>
        Only shown on Jira-sourced items
      </span>
    </div>
  );
}
