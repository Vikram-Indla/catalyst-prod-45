// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ FILTER BAR COMPONENT
// Dropdown filter buttons (Label, Assigned To, Date Range, Status)
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Tag, User, Calendar, Clock, ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FilterType = 'label' | 'assignee' | 'date' | 'status';

interface FilterConfig {
  type: FilterType;
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string }[];
}

const filterConfigs: FilterConfig[] = [
  {
    type: 'label',
    label: 'Label',
    icon: Tag,
    options: [
      { value: 'priority', label: 'Priority' },
      { value: 'product', label: 'Product' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'operations', label: 'Operations' },
    ],
  },
  {
    type: 'assignee',
    label: 'Assigned To',
    icon: User,
    options: [
      { value: 'me', label: 'Assigned to me' },
      { value: 'unassigned', label: 'Unassigned' },
    ],
  },
  {
    type: 'date',
    label: 'Date Range',
    icon: Calendar,
    options: [
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'quarter', label: 'This Quarter' },
    ],
  },
  {
    type: 'status',
    label: 'Status',
    icon: Clock,
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'archived', label: 'Archived' },
    ],
  },
];

export interface FilterState {
  label?: string;
  assignee?: string;
  date?: string;
  status?: string;
}

interface T10FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function T10FilterBar({ filters, onFilterChange }: T10FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<FilterType | null>(null);

  const handleFilterSelect = (type: FilterType, value: string) => {
    const newFilters = { ...filters };
    if (value === 'all' || newFilters[type] === value) {
      delete newFilters[type];
    } else {
      newFilters[type] = value;
    }
    onFilterChange(newFilters);
    setOpenDropdown(null);
  };

  const clearFilter = (type: FilterType, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFilters = { ...filters };
    delete newFilters[type];
    onFilterChange(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="t10-filter-bar">
      {filterConfigs.map((config) => {
        const isActive = !!filters[config.type];
        const activeOption = config.options.find(o => o.value === filters[config.type]);
        const Icon = config.icon;

        return (
          <div key={config.type} className="t10-filter-dropdown">
            <button
              className={`t10-filter-btn ${isActive ? 't10-filter-btn--active' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === config.type ? null : config.type)}
            >
              <Icon size={16} />
              <span>{activeOption?.label || config.label}</span>
              {isActive ? (
                <X 
                  size={14} 
                  className="t10-filter-btn__clear"
                  onClick={(e) => clearFilter(config.type, e)}
                />
              ) : (
                <ChevronDown className="t10-filter-btn__chevron" />
              )}
            </button>
            
            {openDropdown === config.type && (
              <>
                <div 
                  className="t10-filter-dropdown__backdrop" 
                  onClick={() => setOpenDropdown(null)} 
                />
                <div className="t10-filter-dropdown__menu">
                  {config.options.map((option) => (
                    <button
                      key={option.value}
                      className={`t10-filter-dropdown__item ${
                        filters[config.type] === option.value ? 't10-filter-dropdown__item--selected' : ''
                      }`}
                      onClick={() => handleFilterSelect(config.type, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
      
      {hasActiveFilters && (
        <button 
          className="t10-filter-clear-all"
          onClick={() => onFilterChange({})}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export default T10FilterBar;
