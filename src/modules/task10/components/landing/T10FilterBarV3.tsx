// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10FilterBarV3
// Purpose: Horizontal filter bar with working dropdown filters
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { T10LabelFilter } from './T10LabelFilter';
import { T10AssigneeFilter } from './T10AssigneeFilter';
import { T10DateRangeFilter } from './T10DateRangeFilter';
import { T10StatusFilter } from './T10StatusFilter';
import type { T10DateRangePreset, T10ListStatus } from '../../types';

interface T10FilterBarV3Props {
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  selectedAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
  selectedDateRange: T10DateRangePreset | null;
  selectedDateStart?: string | null;
  selectedDateEnd?: string | null;
  onDateRangeChange: (preset: T10DateRangePreset | null, start?: string, end?: string) => void;
  selectedStatus: T10ListStatus | 'all';
  onStatusChange: (status: T10ListStatus | 'all') => void;
}

export function T10FilterBarV3({
  selectedLabels,
  onLabelsChange,
  selectedAssignees,
  onAssigneesChange,
  selectedDateRange,
  selectedDateStart,
  selectedDateEnd,
  onDateRangeChange,
  selectedStatus,
  onStatusChange,
}: T10FilterBarV3Props) {
  return (
    <div className="t10-filter-bar-v3">
      {/* Label Filter */}
      <T10LabelFilter
        selectedLabels={selectedLabels}
        onApply={onLabelsChange}
      />

      {/* Assignee Filter */}
      <T10AssigneeFilter
        selectedAssignees={selectedAssignees}
        onApply={onAssigneesChange}
      />

      {/* Date Range Filter */}
      <T10DateRangeFilter
        selectedPreset={selectedDateRange}
        customStart={selectedDateStart || null}
        customEnd={selectedDateEnd || null}
        onApply={onDateRangeChange}
      />

      {/* Status Filter */}
      <T10StatusFilter
        selectedStatus={selectedStatus}
        onApply={onStatusChange}
      />
    </div>
  );
}

export default T10FilterBarV3;
