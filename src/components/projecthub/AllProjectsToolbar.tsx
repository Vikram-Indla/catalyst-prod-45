import { Search, SlidersHorizontal, List, LayoutGrid, X } from 'lucide-react';
import type { ProjectFilters, ViewMode } from '@/types/projecthub';
import { useState, useEffect } from 'react';

interface ToolbarProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filters: ProjectFilters;
  onFilterChange: (f: ProjectFilters) => void;
  stats: {
    total: number;
    statusActive: number;
    statusOnHold: number;
    statusPlanning: number;
    statusCompleted: number;
    statusStarred: number;
  };
}

const CHIPS = [
  { label: 'All', key: 'All', countKey: 'total' as const },
  { label: '★ Starred', key: 'Starred', countKey: 'statusStarred' as const },
  { label: 'Active', key: 'Active', countKey: 'statusActive' as const },
  { label: 'On Hold', key: 'On Hold', countKey: 'statusOnHold' as const },
  { label: 'Planning', key: 'Planning', countKey: 'statusPlanning' as const },
  { label: 'Completed', key: 'Completed', countKey: 'statusCompleted' as const },
];

export function AllProjectsToolbar({ view, onViewChange, filters, onFilterChange, stats }: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...filters, search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Status chips */}
      <div style={{ display: 'flex', gap: 4 }}>
        {CHIPS.map(c => {
          const active = filters.statusChip === c.key;
          const count = stats[c.countKey];
          return (
            <button
              key={c.key}
              onClick={() => onFilterChange({ ...filters, statusChip: c.key })}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 28, padding: '0 10px', fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? '#2563EB' : (isDark ? 'rgba(248,244,240,0.72)' : '#334155'),
                background: active ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF') : (isDark ? 'transparent' : '#FFF'),
                border: `1px solid ${active ? '#2563EB' : (isDark ? 'rgba(248,244,240,0.10)' : '#E2E8F0')}`,
                borderRadius: 99, cursor: 'pointer',
              }}
            >
              {c.label}
              <span style={{
                padding: '1px 6px', fontSize: 10, fontWeight: 700,
                background: active ? (isDark ? 'rgba(59,130,246,0.20)' : '#DBEAFE') : (isDark ? 'rgba(248,244,240,0.06)' : '#F1F5F9'),
                borderRadius: 99, fontFamily: "'JetBrains Mono', monospace",
                color: active ? (isDark ? '#60A5FA' : undefined) : (isDark ? 'rgba(248,244,240,0.55)' : undefined),
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px',
        background: isDark ? 'transparent' : '#FFF',
        border: `1px solid ${isDark ? 'rgba(248,244,240,0.10)' : '#E2E8F0'}`,
        borderRadius: 6, minWidth: 200,
      }}>
        <Search size={14} color={isDark ? 'rgba(248,244,240,0.40)' : '#94A3B8'} />
        <input
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Search projects..."
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: isDark ? 'rgba(248,244,240,0.92)' : '#0F172A', flex: 1,
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {localSearch && (
          <button onClick={() => setLocalSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={12} color={isDark ? 'rgba(248,244,240,0.40)' : '#94A3B8'} />
          </button>
        )}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', border: `1px solid ${isDark ? 'rgba(248,244,240,0.10)' : '#E2E8F0'}`, borderRadius: 6, overflow: 'hidden' }}>
        <button
          onClick={() => onViewChange('list')}
          style={{
            width: 32, height: 30, border: 'none',
            borderRight: `1px solid ${isDark ? 'rgba(248,244,240,0.10)' : '#E2E8F0'}`,
            background: view === 'list' ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF') : (isDark ? 'transparent' : '#FFF'),
            color: view === 'list' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? 'rgba(248,244,240,0.55)' : '#94A3B8'),
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <List size={14} />
        </button>
        <button
          onClick={() => onViewChange('cards')}
          style={{
            width: 32, height: 30, border: 'none',
            background: view === 'cards' || view === 'card' ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF') : (isDark ? 'transparent' : '#FFF'),
            color: view === 'cards' || view === 'card' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? 'rgba(248,244,240,0.55)' : '#94A3B8'),
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LayoutGrid size={14} />
        </button>
      </div>
    </div>
  );
}