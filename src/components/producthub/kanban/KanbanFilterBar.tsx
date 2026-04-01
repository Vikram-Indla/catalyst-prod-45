import React from 'react';
import { Search } from 'lucide-react';
import { FILTER_CHIPS, type FilterChip } from '@/types/producthub/initiative';

interface KanbanFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterChip;
  onFilterChange: (filter: FilterChip) => void;
}

export const KanbanFilterBar: React.FC<KanbanFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="pk-filters">
      <div className="pk-search">
        <Search className="pk-search-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search initiatives…"
          className="pk-search-input"
        />
        <span className="pk-search-kbd">⌘K</span>
      </div>

      {FILTER_CHIPS.map(chip => {
        const isActive = activeFilter === chip.key;
        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className="pk-chip"
            style={{
              background: isActive ? 'var(--cp-blue-wash)' : 'var(--bg-app)',
              color: isActive ? 'var(--cp-blue)' : '#3F3F46',
              border: isActive ? '1px solid var(--cp-blue)' : '1px solid var(--divider, #E4E4E7)',
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
};
