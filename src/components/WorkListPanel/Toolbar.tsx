/**
 * Toolbar — Search, filter, sort, refresh controls for WorkListPanel (F1.2)
 *
 * Controls:
 *   - Search input (work item key, summary)
 *   - Filter button with badge (active filter count)
 *   - Sort dropdown (Status, Created, Updated, etc.)
 *   - Refresh button
 */
import React, { useCallback } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

export interface ToolbarProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onFilter: () => void;
  onSort: (sortBy: string) => void;
  onRefresh: () => void;
  activeFilterCount?: number;
  sortBy?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchValue,
  onSearch,
  onFilter,
  onSort,
  onRefresh,
  activeFilterCount = 0,
  sortBy = 'created',
}) => {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value);
    },
    [onSearch]
  );

  const handleSortChange = useCallback(
    (newSort: string) => {
      onSort(newSort);
    },
    [onSort]
  );

  const sortOptions = [
    { id: 'created', label: 'Created' },
    { id: 'updated', label: 'Updated' },
    { id: 'status', label: 'Status' },
    { id: 'key', label: 'Key' },
  ];

  const currentSortLabel =
    sortOptions.find(opt => opt.id === sortBy)?.label || 'Created';

  return (
    <div
      data-testid="work-list-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border, #EBECF0)',
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
      }}
    >
      {/* Search input */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid var(--ds-border, #EBECF0)',
          background: 'var(--ds-surface-sunken, #F4F5F7)',
        }}
      >
        <SearchIcon size="small" color="var(--ds-text-subtlest, #626F86)" />
        <input
          type="text"
          placeholder="Search issues…"
          value={searchValue}
          onChange={handleSearchChange}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
            fontFamily: 'var(--cp-font-body)',
          }}
        />
      </div>

      {/* Filter button */}
      <button
        onClick={onFilter}
        aria-label="Filter"
        title="Filter issues"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          background: activeFilterCount > 0
            ? 'var(--ds-background-information-subtlest, #DEEBFF)'
            : 'transparent',
          cursor: 'pointer',
          color: activeFilterCount > 0
            ? 'var(--ds-text-information, #0055CC)'
            : 'var(--ds-text-subtlest, #626F86)',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background =
            'var(--ds-surface-sunken, #F4F5F7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = activeFilterCount > 0
            ? 'var(--ds-background-information-subtlest, #DEEBFF)'
            : 'transparent';
        }}
      >
        <FilterIcon size="small" color="currentColor" />
        {activeFilterCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--ds-background-information, #0055CC)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Sort dropdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          border: '1px solid var(--ds-border, #EBECF0)',
          background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          overflow: 'hidden',
        }}
      >
        <select
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          aria-label="Sort by"
          style={{
            padding: '6px 8px',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
            cursor: 'pointer',
            fontFamily: 'var(--cp-font-body)',
            outline: 'none',
            appearance: 'none',
            paddingRight: '24px',
          }}
        >
          {sortOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        aria-label="Refresh"
        title="Refresh items"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--ds-text-subtlest, #626F86)',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background =
            'var(--ds-surface-sunken, #F4F5F7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <RefreshIcon size="small" color="currentColor" />
      </button>
    </div>
  );
};
