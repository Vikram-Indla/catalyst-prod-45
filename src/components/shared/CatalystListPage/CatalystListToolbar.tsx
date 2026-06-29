/**
 * CatalystListToolbar — search textfield + up to 4 filter dropdowns + action slot.
 *
 * Matches Jira's Filters directory toolbar:
 *   [🔍 Search filters] [Owner ▾] [Project ▾] [Group ▾]  Clear all  Export CSV
 *
 * Reusable for any list page that needs search + dropdown refinement.
 * All dropdowns use @atlaskit/select (ADS canonical — CLAUDE.md P0 rule).
 *
 * Props:
 *   filters     — array of {id, placeholder, options, value, onChange}
 *                 rendered as isClearable @atlaskit/select dropdowns
 *   actions     — right-side slot for plain-text actions (Export CSV, etc.)
 *                 rendered as bare buttons styled as subtle text links
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Search } from '@/lib/atlaskit-icons';

export interface ToolbarFilterOption {
  label: string;
  value: string;
}

export interface ToolbarFilter {
  id: string;
  placeholder: string;
  options: ToolbarFilterOption[];
  value: ToolbarFilterOption | null;
  onChange: (v: ToolbarFilterOption | null) => void;
}

interface CatalystListToolbarProps {
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  filters?: ToolbarFilter[];
  /** True when any search/filter is active — shows "Clear all" link. */
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
  /** Extra action nodes rendered after Clear all (e.g., Export CSV button). */
  actions?: React.ReactNode;
  /** No outer padding — for embedding inside another row (e.g., tab bar). */
  compact?: boolean;
}

export function CatalystListToolbar({
  search = '',
  searchPlaceholder = 'Search',
  onSearchChange,
  filters = [],
  hasActiveFilters = false,
  onClearAll,
  actions,
  compact = false,
}: CatalystListToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: compact ? '0' : '4px 24px',
        flexShrink: 0,
      }}
    >
      {onSearchChange && (
        <div style={{ flex: '1 1 180px', minWidth: 140, maxWidth: 280 }}>
          <Textfield
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span
                style={{
                  paddingLeft: 8,
                  color: token('color.icon.subtle'),
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search size="small" />
              </span>
            }
          />
        </div>
      )}

      {filters.map(f => (
        <div key={f.id} style={{ flex: '1 1 140px', minWidth: 120, maxWidth: 200 }}>
          <Select
            placeholder={f.placeholder}
            options={f.options}
            value={f.value}
            onChange={v => f.onChange(v as ToolbarFilterOption | null)}
            isClearable
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={portalSelectStyles}
          />
        </div>
      ))}

      {hasActiveFilters && onClearAll && (
        <button
          onClick={onClearAll}
          style={{
            background: 'none',
            border: 'none',
            padding: '0 4px',
            fontSize: 'var(--ds-font-size-400)',
            color: token('color.link'),
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Clear all
        </button>
      )}

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
