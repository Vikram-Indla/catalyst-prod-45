/**
 * Task¹⁰ Filter Bar - Enterprise styled Status, Assignee, Label filters + Search
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

const selectStyles = "px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium cursor-pointer hover:bg-slate-100 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all";

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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-5">
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-transparent rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              onClick={() => onSearchChange('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Status Filter */}
        <select 
          className={`${selectStyles} min-w-[130px]`}
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
          className={`${selectStyles} min-w-[140px]`}
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
          className={`${selectStyles} min-w-[120px]`}
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
          <button 
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" 
            onClick={clearAllFilters}
          >
            <X size={14} />
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default AqdFilterBar;
