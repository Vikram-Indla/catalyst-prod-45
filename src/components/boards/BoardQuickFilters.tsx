import React from 'react';
import { useBoardStore } from '@/stores/boardStore';

const FILTERS = [
  { id: 'all', label: 'All Issues' },
  { id: 'mine', label: 'My Issues' },
  { id: 'release', label: 'Current Release' },
];

export default function BoardQuickFilters() {
  const { activeQuickFilter, setActiveQuickFilter } = useBoardStore();

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {FILTERS.map(f => {
        const active = activeQuickFilter === f.id;
        const disabled = f.id === 'release'; // disabled until releases wired
        return (
          <button
            key={f.id}
            onClick={() => !disabled && setActiveQuickFilter(f.id)}
            disabled={disabled}
            title={disabled ? 'No release configured for this board' : undefined}
            style={{
              height: 28, padding: '0 12px', borderRadius: 14,
              border: `0.75px solid ${active ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
              background: active ? 'var(--cp-primary-5)' : '#FFFFFF',
              color: active ? 'var(--cp-primary-60)' : disabled ? 'var(--cp-text-muted)' : 'var(--cp-text-secondary)',
              fontSize: 12, fontWeight: active ? 600 : 500,
              fontFamily: 'var(--cp-font-body)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 80ms',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
