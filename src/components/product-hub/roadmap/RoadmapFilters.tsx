/**
 * Product Roadmap — Search, Filter Pills, Type Tabs, Legend
 */
import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { InitiativeType, QuickFilter } from './types/roadmap.types';
import { TYPE_COLORS, INK, INK_DARK, SURFACE, SURFACE_DARK } from './constants/roadmap.constants';
import { useTheme } from '@/hooks/useTheme';

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
  { key: 'project', label: 'Projects', dot: TYPE_COLORS.project.solid },
  { key: 'enhancement', label: 'Enhancements', dot: TYPE_COLORS.enhancement.solid },
  { key: 'entity_integration', label: 'Entity Integration', dot: TYPE_COLORS.entity_integration.solid },
  { key: 'improvement', label: 'Improvements', dot: TYPE_COLORS.improvement.solid },
];

const LEGEND = [
  { label: 'Project', gradient: TYPE_COLORS.project.gradient },
  { label: 'Enhancement', gradient: TYPE_COLORS.enhancement.gradient },
  { label: 'Entity Integration', gradient: TYPE_COLORS.entity_integration.gradient },
  { label: 'Improvement', gradient: TYPE_COLORS.improvement.gradient },
];

export function RoadmapFilters({
  search, onSearchChange, quickFilter, onQuickFilterChange, typeFilter, onTypeFilterChange,
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
    <>
      {/* Search + Quick Filter Pills */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}>
        <div className="relative" style={{ width: 224 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: ink[3] }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search initiatives..."
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
              e.currentTarget.style.borderColor = '#2563EB';
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
                  background: isActive ? '#2563EB' : 'transparent',
                  color: isActive ? '#FFFFFF' : ink[2],
                  border: isActive ? '1px solid #2563EB' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? '#292929' : surface.page; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Tabs + Legend */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${surface.border}`, background: surface.card }}>
        <div className="flex items-center gap-1">
          {TYPE_TABS.map(t => {
            const isActive = typeFilter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTypeFilterChange(t.key)}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                style={{
                  borderRadius: 6,
                  background: isActive ? (isDark ? '#292929' : '#F8FAFC') : 'transparent',
                  color: isActive ? ink[1] : ink[2],
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? '#292929' : surface.page; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {t.dot && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: t.dot, display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: ink[4] }}>Legend</span>
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div style={{ width: 16, height: 6, borderRadius: 4, background: l.gradient }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: ink[2] }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
