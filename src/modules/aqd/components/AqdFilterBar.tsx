/**
 * Task¹⁰ Filter Bar - Status, Assignee, Label filters + Search
 */
import { Search, X } from 'lucide-react';
import type { AqdLabel, AqdItemStatus } from '../types/aqd.types';

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

      {/* ISSUE 7 FIX: Native select dropdowns instead of pills */}
      <div className="aqd-filter-dropdowns flex items-center gap-2">
        {/* Status Filter */}
        <select 
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as AqdItemStatus | 'all')}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select 
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={assigneeFilter}
          onChange={(e) => onAssigneeFilterChange(e.target.value)}
        >
          <option value="all">All Assignees</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </select>

        {/* Label Filter */}
        <select 
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={labelFilter}
          onChange={(e) => onLabelFilterChange(e.target.value)}
        >
          <option value="all">All Labels</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button className="aqd-filter-clear flex items-center gap-1 px-2 py-1 text-sm text-slate-500 hover:text-slate-700" onClick={clearAllFilters}>
            <X size={14} />
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default AqdFilterBar;
