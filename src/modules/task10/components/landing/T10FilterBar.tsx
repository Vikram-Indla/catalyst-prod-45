// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ FILTER BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { ChevronDown } from 'lucide-react';
import type { T10ListStatus } from '../../types';

interface FilterOption {
  value: T10ListStatus | 'all';
  label: string;
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All Lists' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

interface T10FilterBarProps {
  selectedFilter: T10ListStatus | 'all';
  onFilterChange: (filter: T10ListStatus | 'all') => void;
  sortBy?: 'recent' | 'name' | 'progress';
  onSortChange?: (sort: 'recent' | 'name' | 'progress') => void;
}

export function T10FilterBar({ 
  selectedFilter, 
  onFilterChange,
  sortBy = 'recent',
  onSortChange,
}: T10FilterBarProps) {
  return (
    <div className="t10-filter-bar">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          className={`t10-filter-btn ${
            selectedFilter === option.value ? 't10-filter-btn--active' : ''
          }`}
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
        </button>
      ))}
      
      <div className="t10-filter-bar__divider" />
      
      <button className="t10-filter-btn">
        Sort: {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Progress'}
        <ChevronDown className="t10-filter-btn__chevron" />
      </button>
    </div>
  );
}

export default T10FilterBar;
