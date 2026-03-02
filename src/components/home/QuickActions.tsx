/**
 * QuickActions — Role-filtered preset chips.
 */
import React from 'react';

const F = { inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" };

export function QuickActions({ presets, onSelect }: {
  presets: Array<{ label: string; query: string }>;
  onSelect: (query: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: '#8B8FA3',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.inter,
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
              border: '1.5px solid #ECEEF2', background: '#FFFFFF',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#1A1D23',
              fontFamily: F.inter, transition: 'all 100ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#4C6EF5';
              e.currentTarget.style.background = '#EDF2FF';
              e.currentTarget.style.color = '#4C6EF5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#ECEEF2';
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#1A1D23';
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
