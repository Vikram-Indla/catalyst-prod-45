/**
 * Task¹⁰ Filter Bar - Status, Assignee, Label filters + Search
 */
import { Search, X, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AqdLabel, AqdItemStatus } from '../types/aqd.types';
import { AQD_STATUS_CONFIG } from '../types/aqd.types';

interface AqdFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: AqdItemStatus | 'all';
  onStatusFilterChange: (status: AqdItemStatus | 'all') => void;
  labelFilter: string | 'all';
  onLabelFilterChange: (labelId: string | 'all') => void;
  labels: AqdLabel[];
  assigneeFilter: string | 'all';
  onAssigneeFilterChange: (assigneeId: string | 'all') => void;
  assignees: { id: string; name: string }[];
}

const STATUS_OPTIONS: { value: AqdItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'not_started', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function AqdFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  labelFilter,
  onLabelFilterChange,
  labels,
  assigneeFilter,
  onAssigneeFilterChange,
  assignees,
}: AqdFilterBarProps) {
  const activeFiltersCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (labelFilter !== 'all' ? 1 : 0) + 
    (assigneeFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    onStatusFilterChange('all');
    onLabelFilterChange('all');
    onAssigneeFilterChange('all');
    onSearchChange('');
  };

  const selectedStatus = STATUS_OPTIONS.find(s => s.value === statusFilter);
  const selectedLabel = labels.find(l => l.id === labelFilter);
  const selectedAssignee = assignees.find(a => a.id === assigneeFilter);

  return (
    <div className="aqd-filter-bar">
      {/* Search Input */}
      <div className="aqd-filter-search">
        <Search size={16} className="aqd-filter-search-icon" />
        <input
          type="text"
          className="aqd-filter-search-input"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="aqd-filter-search-clear"
            onClick={() => onSearchChange('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="aqd-filter-dropdowns">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn('aqd-filter-btn', statusFilter !== 'all' && 'aqd-filter-btn-active')}>
              {selectedStatus?.label || 'Status'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="aqd-filter-popover" align="start" sideOffset={4}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={cn('aqd-filter-option', statusFilter === option.value && 'aqd-filter-option-active')}
                onClick={() => onStatusFilterChange(option.value)}
              >
                {option.value !== 'all' && (
                  <span 
                    className="aqd-filter-option-dot" 
                    style={{ background: AQD_STATUS_CONFIG[option.value].color }}
                  />
                )}
                {option.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn('aqd-filter-btn', assigneeFilter !== 'all' && 'aqd-filter-btn-active')}>
              {selectedAssignee?.name || 'Assignee'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="aqd-filter-popover" align="start" sideOffset={4}>
            <button
              className={cn('aqd-filter-option', assigneeFilter === 'all' && 'aqd-filter-option-active')}
              onClick={() => onAssigneeFilterChange('all')}
            >
              All Assignees
            </button>
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                className={cn('aqd-filter-option', assigneeFilter === assignee.id && 'aqd-filter-option-active')}
                onClick={() => onAssigneeFilterChange(assignee.id)}
              >
                {assignee.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Label Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn('aqd-filter-btn', labelFilter !== 'all' && 'aqd-filter-btn-active')}>
              {selectedLabel?.name || 'Label'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="aqd-filter-popover" align="start" sideOffset={4}>
            <button
              className={cn('aqd-filter-option', labelFilter === 'all' && 'aqd-filter-option-active')}
              onClick={() => onLabelFilterChange('all')}
            >
              All Labels
            </button>
            {labels.map((label) => (
              <button
                key={label.id}
                className={cn('aqd-filter-option', labelFilter === label.id && 'aqd-filter-option-active')}
                onClick={() => onLabelFilterChange(label.id)}
              >
                <span 
                  className="aqd-filter-option-dot" 
                  style={{ background: label.color }}
                />
                {label.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button className="aqd-filter-clear" onClick={clearAllFilters}>
            <X size={14} />
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default AqdFilterBar;
