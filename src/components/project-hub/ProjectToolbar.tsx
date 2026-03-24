import { useState, useEffect } from 'react';
import { Plus, Search, List, LayoutGrid } from 'lucide-react';
import { FilterDropdown, FilterChips, FilterState } from './FilterDropdown';

interface ProjectToolbarProps {
  view: 'table' | 'card';
  onViewChange: (v: 'table' | 'card') => void;
  search: string;
  onSearchChange: (s: string) => void;
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  onNewProject?: () => void;
  isDark?: boolean;
}

export function ProjectToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onNewProject,
  isDark = false,
}: ProjectToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  const borderColor = isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0';
  const surfaceBg = isDark ? 'transparent' : '#FFFFFF';
  const textColor = isDark ? 'rgba(248,244,240,0.92)' : '#0F172A';
  const mutedColor = isDark ? 'rgba(248,244,240,0.40)' : '#94A3B8';
  const subtleColor = isDark ? 'rgba(248,244,240,0.60)' : '#64748B';

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
            background: surfaceBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            minWidth: 220,
          }}
        >
          <Search size={14} style={{ color: mutedColor }} strokeWidth={2} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: textColor, fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md" style={{ border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
          <button
            onClick={() => onViewChange('table')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 34,
              height: 32,
              background: view === 'table' ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF') : surfaceBg,
              color: view === 'table' ? (isDark ? '#60A5FA' : '#2563EB') : subtleColor,
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
              background: view === 'card' ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF') : surfaceBg,
              color: view === 'card' ? (isDark ? '#60A5FA' : '#2563EB') : subtleColor,
              border: 'none',
              borderLeft: `1px solid ${borderColor}`,
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
