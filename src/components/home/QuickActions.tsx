/**
 * QuickActions — Role-filtered preset chips.
 */
import React from 'react';

export function QuickActions({ presets, onSelect }: {
  presets: Array<{ label: string; query: string }>;
  onSelect: (query: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={{
        fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: 'var(--fg-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--ds-font-family-body)',
      }}>
        QUICK ACTIONS
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {presets.map(p => (
          <button
            key={p.query}
            onClick={() => onSelect(p.query)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1.5px solid var(--divider)', background: 'var(--cp-float)',
              cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--fg-1)',
              fontFamily: 'var(--ds-font-family-body)', transition: 'all 100ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--cp-blue)';
              e.currentTarget.style.background = 'var(--cp-blue-wash)';
              e.currentTarget.style.color = 'var(--cp-blue)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--divider)';
              e.currentTarget.style.background = 'var(--cp-float)';
              e.currentTarget.style.color = 'var(--fg-1)';
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
