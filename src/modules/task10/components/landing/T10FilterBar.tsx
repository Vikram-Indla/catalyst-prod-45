// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10FilterBar
// Purpose: Container for all landing page filters
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { X } from 'lucide-react';
import { T10LabelFilter } from './T10LabelFilter';
import { T10AssigneeFilter } from './T10AssigneeFilter';
import { T10DateRangeFilter } from './T10DateRangeFilter';
import { T10StatusFilter } from './T10StatusFilter';
import type { T10FilterState, T10ListStatus, T10DateRangePreset } from '../../types';

interface T10FilterBarProps {
  filters: T10FilterState;
  onLabelChange: (labelIds: string[]) => void;
  onAssigneeChange: (userIds: string[]) => void;
  onDateRangeChange: (preset: T10DateRangePreset | null, start?: string | null, end?: string | null) => void;
  onStatusChange: (status: T10ListStatus | 'all') => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function T10FilterBar({
  filters,
  onLabelChange,
  onAssigneeChange,
  onDateRangeChange,
  onStatusChange,
  onClearAll,
  hasActiveFilters,
}: T10FilterBarProps) {
  return (
    <div className="t10-filter-bar">
      {/* Label Filter */}
      <T10LabelFilter
        selectedLabels={filters.labels}
        onApply={onLabelChange}
      />

      {/* Assignee Filter */}
      <T10AssigneeFilter
        selectedAssignees={filters.assignees}
        onApply={onAssigneeChange}
      />

      {/* Date Range Filter */}
      <T10DateRangeFilter
        selectedPreset={filters.dateRange.preset}
        customStart={filters.dateRange.start}
        customEnd={filters.dateRange.end}
        onApply={onDateRangeChange}
      />

      {/* Status Filter */}
      <T10StatusFilter
        selectedStatus={filters.status}
        onApply={onStatusChange}
      />

      {/* Clear All Button */}
      {hasActiveFilters && (
        <button
          type="button"
          className="t10-clear-filters-btn"
          onClick={() => {
            onClearAll();
            console.log('[T10] All filters cleared');
          }}
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default T10FilterBar;
