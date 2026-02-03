// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10StatusFilter
// Purpose: Single-select filter for list status
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { T10FilterDropdown } from './T10FilterDropdown';
import type { T10ListStatus } from '../../types';

type StatusOption = T10ListStatus | 'all';

interface T10StatusFilterProps {
  selectedStatus: StatusOption;
  onApply: (status: StatusOption) => void;
}

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function T10StatusFilter({ selectedStatus, onApply }: T10StatusFilterProps) {
  const [localStatus, setLocalStatus] = useState<StatusOption>(selectedStatus);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalStatus(selectedStatus);
  }, [selectedStatus]);

  const handleSelect = (status: StatusOption) => {
    setLocalStatus(status);
    // Apply immediately for single-select
    onApply(status);
    console.log('[T10] Status filter applied:', status);
  };

  const handleClose = () => {
    setLocalStatus(selectedStatus);
  };

  return (
    <T10FilterDropdown
      icon={<Clock size={16} />}
      label="Status"
      selectedCount={selectedStatus !== 'all' ? 1 : 0}
      isActive={selectedStatus !== 'all'}
      onClose={handleClose}
    >
      {/* Options */}
      <div className="t10-dropdown-options">
        {STATUS_OPTIONS.map(option => {
          const isSelected = localStatus === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`t10-dropdown-option ${isSelected ? 't10-selected' : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={isSelected}
            >
              <div className="t10-dropdown-option-radio">
                <div className="t10-dropdown-option-radio-inner" />
              </div>
              <span className="t10-dropdown-option-label">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </T10FilterDropdown>
  );
}

export default T10StatusFilter;
