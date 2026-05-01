import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useBoardStore } from '@/stores/boardStore';

const FILTERS = [
  { id: 'all', label: 'All Issues' },
  { id: 'mine', label: 'My Issues' },
  { id: 'release', label: 'Current Release' },
];

export default function BoardQuickFilters() {
  const { activeQuickFilter, setActiveQuickFilter } = useBoardStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
      {FILTERS.map(f => {
        const active = activeQuickFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActiveQuickFilter(f.id)}
            style={{
              height: 26, padding: '8px 12px', borderRadius: 13,
              border: 'none',
              background: active ? 'var(--cp-blue)' : 'var(--cp-bd-zone)',
              color: active ? 'var(--ds-surface, #FFFFFF)' : 'var(--fg-2)',
              fontSize: 12, fontWeight: active ? 600 : 500,
              fontFamily: 'var(--cp-font-body)',
              cursor: 'pointer',
              transition: 'all 80ms',
            }}
          >
            {f.label}
          </button>
        );
      })}
      {/* Separator */}
      <span style={{ width: 0.75, height: 18, background: 'rgba(15,23,42,0.12)' }} />
      {/* Filters dropdown trigger */}
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 26, padding: '0 10px', borderRadius: 13,
        border: 'none', background: 'var(--cp-bd-zone)',
        color: 'var(--fg-2)', fontSize: 12, fontWeight: 500,
        fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
      }}>
        <SlidersHorizontal size={12} /> Filters
      </button>
      {/* Sync indicator */}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>
        synced: just now
      </span>
    </div>
  );
}
