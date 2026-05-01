import { useState, useEffect } from 'react';
import { Search, List, LayoutGrid } from 'lucide-react';
import { FilterDropdown, FilterChips, FilterState } from './FilterDropdown';

interface ProjectToolbarProps {
  view: 'table' | 'card';
  onViewChange: (v: 'table' | 'card') => void;
  search: string;
  onSearchChange: (s: string) => void;
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  isDark?: boolean;
}

export function ProjectToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  isDark = false,
}: ProjectToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  const borderColor = 'var(--cp-border, #E2E8F0)';
  const surfaceBg = 'var(--cp-bg-elevated, #FFFFFF)';
  const textColor = 'var(--cp-text-primary, #0F172A)';
  const mutedColor = 'var(--cp-text-muted, #94A3B8)';
  const subtleColor = 'var(--cp-text-tertiary, #6B778C)';

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter */}
        <FilterDropdown
          filters={filters}
          onChange={onFilterChange}
        />

        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-[6px]"
          style={{
            height: 32,
            padding: '0 10px',
            backgroundColor: surfaceBg,
            border: `1px solid ${borderColor}`,
            minWidth: 220,
          }}
        >
          <Search size={14} style={{ color: mutedColor }} strokeWidth={2} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: textColor, fontFamily: 'var(--cp-font-body)' }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-[6px]" style={{ border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
          <button
            onClick={() => onViewChange('table')}
            className="flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]"
            style={{
              width: 32,
              height: 32,
              backgroundColor: view === 'table' ? ('var(--cp-primary-light, #DEEBFF)') : surfaceBg,
              color: view === 'table' ? ('var(--cp-text-link, #0052CC)') : subtleColor,
              border: 'none',
              cursor: 'pointer',
            }}
            title="Table view"
          >
            <List size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onViewChange('card')}
            className="flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]"
            style={{
              width: 32,
              height: 32,
              backgroundColor: view === 'card' ? ('var(--cp-primary-light, #DEEBFF)') : surfaceBg,
              color: view === 'card' ? ('var(--cp-text-link, #0052CC)') : subtleColor,
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
