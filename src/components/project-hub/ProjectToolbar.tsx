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

  const borderColor = isDark ? '#2E2E2E' : 'var(--divider)';
  const surfaceBg = isDark ? 'transparent' : '#FFFFFF';
  const textColor = isDark ? '#EDEDED' : 'var(--fg-1)';
  const mutedColor = isDark ? '#7D7D7D' : 'var(--fg-4)';
  const subtleColor = isDark ? '#878787' : 'var(--fg-3)';

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
            backgroundColor: 'var(--cp-blue)',
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
            backgroundColor: surfaceBg,
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
              backgroundColor: view === 'table' ? (isDark ? 'rgba(59,130,246,0.10)' : 'var(--cp-blue-wash)') : surfaceBg,
              color: view === 'table' ? (isDark ? 'var(--cp-blue-light)' : 'var(--cp-blue)') : subtleColor,
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
              backgroundColor: view === 'card' ? (isDark ? 'rgba(59,130,246,0.10)' : 'var(--cp-blue-wash)') : surfaceBg,
              color: view === 'card' ? (isDark ? 'var(--cp-blue-light)' : 'var(--cp-blue)') : subtleColor,
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
