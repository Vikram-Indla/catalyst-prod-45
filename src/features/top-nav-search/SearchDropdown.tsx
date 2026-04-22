import React from 'react';
import Spinner from '@atlaskit/spinner';
import { SearchSection } from './SearchSection';
import type { SearchItem, SearchState } from './types';

interface SearchDropdownProps {
  query: string;
  state: SearchState;
  items: SearchItem[];
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
  onItemClick: (item: SearchItem) => void;
}

export function SearchDropdown({
  query,
  state,
  items,
  activeIndex,
  onActiveIndexChange,
  onItemClick,
}: SearchDropdownProps) {
  const sectionLabel =
    query.length >= 2 ? 'Results' : 'Recently viewed';

  return (
    <div
      id="tnav-listbox"
      role="listbox"
      aria-label="Search results"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        maxHeight: '60vh',
        overflowY: 'auto',
        padding: '4px 0',
        marginTop: 4,
      }}
    >
      {state === 'loading' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 80,
          }}
        >
          <Spinner size="medium" />
        </div>
      )}

      {(state === 'results' || state === 'active') && items.length > 0 && (
        <SearchSection
          label={sectionLabel}
          items={items}
          activeIndex={activeIndex}
          indexOffset={0}
          onItemHover={onActiveIndexChange}
          onItemClick={onItemClick}
        />
      )}

      {state === 'empty' && (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            fontSize: 14,
            color: '#94A3B8',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          No results for &ldquo;{query}&rdquo;
        </div>
      )}

      {(state === 'active' || state === 'loading') && items.length === 0 && state !== 'loading' && (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            fontSize: 14,
            color: '#94A3B8',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          No recent items
        </div>
      )}

      <div
        style={{
          borderTop: items.length > 0 ? '1px solid #E2E8F0' : undefined,
          padding: items.length > 0 ? '8px 12px' : '0 12px 8px',
          fontSize: 11,
          color: '#94A3B8',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'right',
        }}
      >
        <kbd
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            color: '#475569',
            background: '#F4F5F7',
            border: '1px solid #DFE1E6',
            borderRadius: 3,
            padding: '1px 4px',
          }}
        >
          ↵
        </kbd>
        &nbsp;to navigate &nbsp;
        <kbd
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            color: '#475569',
            background: '#F4F5F7',
            border: '1px solid #DFE1E6',
            borderRadius: 3,
            padding: '1px 4px',
          }}
        >
          esc
        </kbd>
        &nbsp;to close
      </div>
    </div>
  );
}
