/**
 * WorkListFilters — Filter bar for work list (F1.17)
 *
 * Search input with active filter count and clear button.
 */
import React, { memo } from 'react';

export interface WorkListFiltersProps {
  searchTerm: string;
  activeFilterCount: number;
  onChange: (searchTerm: string) => void;
  onClearFilters: () => void;
}

export const WorkListFilters = memo(function WorkListFilters({
  searchTerm,
  activeFilterCount,
  onChange,
  onClearFilters,
}: WorkListFiltersProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderBottom: '1px solid #DCDFE6',
      }}
    >
      <input
        type="text"
        placeholder="Search work items..."
        value={searchTerm}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #DCDFE6',
          borderRadius: '3px',
          fontFamily: 'inherit',
        }}
      />
      {activeFilterCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#626F86',
            }}
          >
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClearFilters}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#0055CC',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
});
