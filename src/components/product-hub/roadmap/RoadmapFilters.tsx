/**
 * Product Roadmap — Search + Quick Filter Pills
 */
import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { RequestType, QuickFilter } from './types/roadmap.types';
import { INK, INK_DARK, SURFACE, SURFACE_DARK } from './constants/roadmap.constants';
import { useTheme } from '@/hooks/useTheme';

interface RoadmapFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (f: QuickFilter) => void;
  typeFilter?: RequestType | 'all';
  onTypeFilterChange?: (t: RequestType | 'all') => void;
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

export function RoadmapFilters({
  search, onSearchChange, quickFilter, onQuickFilterChange,
}: RoadmapFiltersProps) {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}>
      <div className="relative" style={{ width: 224 }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: ink[3] }} />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search business requests..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full h-8 pl-9 pr-3 text-xs"
          style={{
            border: `1.5px solid ${surface.border}`,
            borderRadius: 6,
            background: isDark ? 'transparent' : surface.page,
            color: ink[1],
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563EB)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = surface.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {QUICK_FILTERS.map(f => {
          const isActive = quickFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onQuickFilterChange(f.key)}
              className="h-7 px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
              style={{
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--ds-text-brand, #2563EB)' : 'transparent',
                color: isActive ? 'var(--ds-text-inverse, #FFFFFF)' : ink[2],
                border: isActive ? '1px solid #2563EB' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? 'var(--ds-border, #292929)' : surface.page; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
