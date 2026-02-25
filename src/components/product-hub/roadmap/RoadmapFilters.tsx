/**
 * Product Roadmap — Search, Filter Pills, Type Tabs, Legend
 * Polish: focus-visible, transitions, auto-focus search ref
 */
import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { InitiativeType, QuickFilter } from './types/roadmap.types';
import { TYPE_COLORS, INK, SURFACE } from './constants/roadmap.constants';

interface RoadmapFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (f: QuickFilter) => void;
  typeFilter: InitiativeType | 'all';
  onTypeFilterChange: (t: InitiativeType | 'all') => void;
}

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'my', label: 'My Items' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'high', label: 'High Priority' },
  { key: 'unscored', label: 'Unscored' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'starred', label: '★ Starred' },
];

const TYPE_TABS: { key: InitiativeType | 'all'; label: string; dot: string | null }[] = [
  { key: 'all', label: 'All Types', dot: null },
  { key: 'project', label: 'Projects', dot: '#2563EB' },
  { key: 'enhancement', label: 'Enhancements', dot: '#0D9488' },
  { key: 'improvement', label: 'Improvements', dot: '#D97706' },
];

const LEGEND = [
  { label: 'Project', color: '#2563EB' },
  { label: 'Enhancement', color: '#0D9488' },
  { label: 'Improvement', color: '#D97706' },
];

export function RoadmapFilters({
  search, onSearchChange, quickFilter, onQuickFilterChange, typeFilter, onTypeFilterChange,
}: RoadmapFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on page load
  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Search + Quick Filter Pills */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
        <div className="relative" style={{ width: 220 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: INK[4] }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search initiatives..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, background: SURFACE.card, color: INK[1] }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onQuickFilterChange(f.key)}
              className="h-7 px-3 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
              style={{
                borderRadius: 20,
                background: quickFilter === f.key ? '#EFF6FF' : SURFACE.page,
                color: quickFilter === f.key ? '#2563EB' : INK[3],
                border: quickFilter === f.key ? '1px solid #93C5FD' : `1px solid ${SURFACE.border}`,
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Tabs + Legend */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
        <div className="flex items-center gap-1">
          {TYPE_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => onTypeFilterChange(t.key)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
              style={{
                borderRadius: 6,
                background: typeFilter === t.key ? SURFACE.page : 'transparent',
                color: typeFilter === t.key ? INK[1] : INK[3],
                borderBottom: typeFilter === t.key ? '2px solid #2563EB' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {t.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.dot }} />}
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[4] }}>Legend</span>
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div style={{ width: 20, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: INK[3] }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
