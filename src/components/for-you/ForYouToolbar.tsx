/**
 * For You Toolbar - Search · Theme-aware
 */

import React from 'react';
import { Search } from 'lucide-react';

interface ForYouToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ForYouToolbar({
  searchQuery,
  onSearchChange,
}: ForYouToolbarProps) {
  return (
    <div className="flex items-center gap-4 flex-1">
      <div
        className="flex items-center gap-1.5 px-3 h-8 rounded-[7px] flex-1 min-w-[240px] max-w-[520px] transition-all duration-150"
        style={{
          background: 'var(--cp-bg)',
          border: '1px solid var(--cp-bd)',
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cp-t4)' }} />
        <input
          type="text"
          placeholder="Search work items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            color: 'var(--cp-t1)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            outline: 'none',
            boxShadow: 'none',
          }}
        />
        <span style={{
          padding: '2px 6px',
          background: 'var(--cp-bd-zone)',
          border: '1px solid var(--cp-bd)',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--cp-t4)',
        }}>
          ⌘K
        </span>
      </div>
    </div>
  );
}
