import { Search, SlidersHorizontal, List, LayoutGrid, X } from 'lucide-react';
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

  const advFilterCount = filters.departments.length + filters.healths.length + filters.categories.length;

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
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? '#2563EB' : '#334155',
                background: active ? '#EFF6FF' : '#FFF',
                border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
                borderRadius: 99,
                cursor: 'pointer',
              }}
            >
              {c.label}
              <span
                style={{
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? '#DBEAFE' : '#F1F5F9',
                  borderRadius: 99,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter button */}
      <button
        onClick={onToggleAdvanced}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 10px',
          fontSize: 12,
          fontWeight: 500,
          color: advFilterCount > 0 || showAdvanced ? '#2563EB' : '#334155',
          background: advFilterCount > 0 || showAdvanced ? '#EFF6FF' : '#FFF',
          border: `1px solid ${advFilterCount > 0 || showAdvanced ? '#2563EB' : '#E2E8F0'}`,
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        <SlidersHorizontal size={13} />
        Filter
        {advFilterCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#FFF',
            borderRadius: 99, padding: '1px 6px',
          }}>
            {advFilterCount}
          </span>
        )}
      </button>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px',
        background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 6, minWidth: 200,
      }}>
        <Search size={14} color="#94A3B8" />
        <input
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Search projects..."
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: '#0F172A', flex: 1,
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {localSearch && (
          <button onClick={() => setLocalSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={12} color="#94A3B8" />
          </button>
        )}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
        <button
          onClick={() => onViewChange('list')}
          style={{
            width: 32, height: 30, border: 'none', borderRight: '1px solid #E2E8F0',
            background: view === 'list' ? '#EFF6FF' : '#FFF',
            color: view === 'list' ? '#2563EB' : '#94A3B8',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <List size={14} />
        </button>
        <button
          onClick={() => onViewChange('card')}
          style={{
            width: 32, height: 30, border: 'none',
            background: view === 'card' ? '#EFF6FF' : '#FFF',
            color: view === 'card' ? '#2563EB' : '#94A3B8',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LayoutGrid size={14} />
        </button>
      </div>
    </div>
  );
}
