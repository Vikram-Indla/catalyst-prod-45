import { Search, SlidersHorizontal, List, LayoutGrid } from 'lucide-react';
import type { ProjectFilters, ViewMode } from '@/types/projecthub';
import { useState, useEffect } from 'react';

interface ToolbarProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filters: ProjectFilters;
  onFilterChange: (f: ProjectFilters) => void;
  onToggleAdvanced: () => void;
  showAdvanced: boolean;
  stats: {
    total: number;
    statusActive: number;
    statusOnHold: number;
    statusPlanning: number;
    statusCompleted: number;
  };
}

const CHIPS = [
  { label: 'All', key: 'All', countKey: 'total' as const },
  { label: 'Active', key: 'Active', countKey: 'statusActive' as const },
  { label: 'On Hold', key: 'On Hold', countKey: 'statusOnHold' as const },
  { label: 'Planning', key: 'Planning', countKey: 'statusPlanning' as const },
  { label: 'Completed', key: 'Completed', countKey: 'statusCompleted' as const },
];

export function AllProjectsToolbar({ view, onViewChange, filters, onFilterChange, onToggleAdvanced, showAdvanced, stats }: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...filters, search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const advFilterCount = filters.departments.length + filters.statuses.length + filters.healths.length + filters.categories.length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Status chips */}
      {CHIPS.map(c => {
        const active = filters.statusChip === c.key;
        const count = stats[c.countKey];
        return (
          <button
            key={c.key}
            onClick={() => onFilterChange({ ...filters, statusChip: c.key })}
            className="flex items-center gap-1.5 rounded-full transition-all"
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              background: active ? '#2563EB' : '#FFF',
              color: active ? '#FFF' : '#64748B',
              border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
              cursor: 'pointer',
            }}
          >
            {c.label}
            <span
              className="rounded-full"
              style={{
                padding: '0 5px',
                fontSize: 10,
                fontWeight: 700,
                background: active ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                color: active ? '#FFF' : '#64748B',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Filter button */}
      <button
        onClick={onToggleAdvanced}
        className="flex items-center gap-1.5 rounded-md transition-all"
        style={{
          height: 30,
          padding: '0 10px',
          background: advFilterCount > 0 || showAdvanced ? '#EFF6FF' : '#FFF',
          color: advFilterCount > 0 || showAdvanced ? '#2563EB' : '#64748B',
          border: `1px solid ${advFilterCount > 0 || showAdvanced ? '#BFDBFE' : '#E2E8F0'}`,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <SlidersHorizontal size={13} />
        <span>Filter</span>
        {advFilterCount > 0 && (
          <span className="rounded-full flex items-center justify-center" style={{ width: 16, height: 16, fontSize: 9, fontWeight: 700, background: '#2563EB', color: '#FFF', marginLeft: 2 }}>
            {advFilterCount}
          </span>
        )}
      </button>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-md" style={{ height: 30, padding: '0 10px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 6, minWidth: 200 }}>
        <Search size={13} color="#94A3B8" />
        <input
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Search projects..."
          className="flex-1 bg-transparent outline-none"
          style={{ fontSize: 12, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-md" style={{ border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <button
          onClick={() => onViewChange('list')}
          className="flex items-center justify-center transition-colors"
          style={{ width: 30, height: 28, background: view === 'list' ? '#EFF6FF' : '#FFF', color: view === 'list' ? '#2563EB' : '#64748B', border: 'none', cursor: 'pointer' }}
        >
          <List size={14} />
        </button>
        <button
          onClick={() => onViewChange('card')}
          className="flex items-center justify-center transition-colors"
          style={{ width: 30, height: 28, background: view === 'card' ? '#EFF6FF' : '#FFF', color: view === 'card' ? '#2563EB' : '#64748B', border: 'none', borderLeft: '1px solid #E2E8F0', cursor: 'pointer' }}
        >
          <LayoutGrid size={14} />
        </button>
      </div>
    </div>
  );
}
