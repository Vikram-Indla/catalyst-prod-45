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
  stats: { total: number; active: number; onHold: number; planning: number; completed: number };
}

const CHIPS = [
  { label: 'All', key: 'All' },
  { label: 'Active', key: 'Active' },
  { label: 'On Hold', key: 'On Hold' },
  { label: 'Planning', key: 'Planning' },
  { label: 'Completed', key: 'Completed' },
];

const CHIP_COUNTS: Record<string, keyof ToolbarProps['stats']> = {
  All: 'total', Active: 'active', 'On Hold': 'onHold', Planning: 'planning', Completed: 'completed',
};

export function AllProjectsToolbar({ view, onViewChange, filters, onFilterChange, onToggleAdvanced, showAdvanced, stats }: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...filters, search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const advFilterCount = filters.departments.length + filters.statuses.length + filters.healths.length + filters.categories.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status chips */}
      {CHIPS.map(c => {
        const active = filters.statusChip === c.key;
        const count = stats[CHIP_COUNTS[c.key]];
        return (
          <button
            key={c.key}
            onClick={() => onFilterChange({ ...filters, statusChip: c.key })}
            className="flex items-center gap-1.5 rounded-full transition-all"
            style={{
              height: 30,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              background: active ? '#EFF6FF' : '#FFF',
              color: active ? '#2563EB' : '#64748B',
              border: `1px solid ${active ? '#BFDBFE' : '#E2E8F0'}`,
              cursor: 'pointer',
            }}
          >
            {c.label}
            <span
              className="rounded-full"
              style={{
                padding: '0 6px',
                fontSize: 10,
                fontWeight: 700,
                background: active ? '#2563EB' : '#F1F5F9',
                color: active ? '#FFF' : '#64748B',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}

      {/* Filter button */}
      <button
        onClick={onToggleAdvanced}
        className="flex items-center gap-1.5 rounded-md transition-all"
        style={{
          height: 30,
          padding: '0 12px',
          fontSize: 12,
          fontWeight: 500,
          background: advFilterCount > 0 || showAdvanced ? '#EFF6FF' : '#FFF',
          color: advFilterCount > 0 || showAdvanced ? '#2563EB' : '#64748B',
          border: `1px solid ${advFilterCount > 0 || showAdvanced ? '#BFDBFE' : '#E2E8F0'}`,
          cursor: 'pointer',
        }}
      >
        <SlidersHorizontal size={13} />
        Filter
        {advFilterCount > 0 && (
          <span className="rounded-full" style={{ padding: '0 5px', fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#FFF' }}>
            {advFilterCount}
          </span>
        )}
      </button>

      <div className="flex-1" />

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
