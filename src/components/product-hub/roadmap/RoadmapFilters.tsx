/**
 * Product Roadmap — Search, Filter Pills, Type Tabs, Legend
 * Fixes: filter pill styling, type tab dots, legend with gradient bars
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

const TYPE_TABS: { key: InitiativeType | 'all'; label: string; dot: string | null; hoverColor: string | null }[] = [
  { key: 'all', label: 'All Types', dot: null, hoverColor: null },
  { key: 'project', label: 'Projects', dot: '#2563EB', hoverColor: '#3B82F6' },
  { key: 'enhancement', label: 'Enhancements', dot: '#0D9488', hoverColor: '#14B8A6' },
  { key: 'improvement', label: 'Improvements', dot: '#D97706', hoverColor: '#F59E0B' },
];

const LEGEND = [
  { label: 'Project', color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)' },
  { label: 'Enhancement', color: '#0D9488', gradient: 'linear-gradient(135deg, #0D9488, #14B8A6)' },
  { label: 'Improvement', color: '#D97706', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)' },
];

export function RoadmapFilters({
  search, onSearchChange, quickFilter, onQuickFilterChange, typeFilter, onTypeFilterChange,
}: RoadmapFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Search + Quick Filter Pills */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
        <div className="relative" style={{ width: 224 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: INK[4] }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search initiatives..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
            style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, background: '#FFFFFF', color: INK[1] }}
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
                  background: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Tabs + Legend */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
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
                  background: isActive ? '#F8FAFC' : 'transparent',
                  color: isActive ? INK[1] : INK[3],
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
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
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>Legend</span>
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              {/* 16×6 gradient bar */}
              <div style={{ width: 16, height: 6, borderRadius: 2, background: l.gradient }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}