import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, List, LayoutGrid } from 'lucide-react';
import { FilterDropdown, FilterChips, FilterState } from './FilterDropdown';
import { toast } from 'sonner';

interface ProjectToolbarProps {
  view: 'table' | 'card';
  onViewChange: (v: 'table' | 'card') => void;
  search: string;
  onSearchChange: (s: string) => void;
  departments: string[];
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  onNewProject?: () => void;
}

export function ProjectToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  departments,
  filters,
  onFilterChange,
  onNewProject,
}: ProjectToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* + New Project */}
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 rounded-md hover:opacity-90 transition-opacity"
          style={{
            height: 34,
            padding: '0 14px',
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New Project
        </button>

        {/* Filter */}
        <FilterDropdown
          departments={departments}
          filters={filters}
          onChange={onFilterChange}
        />

        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-md"
          style={{
            height: 34,
            padding: '0 10px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            minWidth: 220,
          }}
        >
          <Search size={14} color="#94A3B8" strokeWidth={2} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md" style={{ border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            onClick={() => onViewChange('table')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 34,
              height: 32,
              background: view === 'table' ? '#EFF6FF' : '#FFFFFF',
              color: view === 'table' ? '#2563EB' : '#64748B',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Table view"
          >
            <List size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onViewChange('card')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 34,
              height: 32,
              background: view === 'card' ? '#EFF6FF' : '#FFFFFF',
              color: view === 'card' ? '#2563EB' : '#64748B',
              border: 'none',
              borderLeft: '1px solid #E2E8F0',
              cursor: 'pointer',
            }}
            title="Card view"
          >
            <LayoutGrid size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <FilterChips filters={filters} onChange={onFilterChange} />
    </div>
  );
}
