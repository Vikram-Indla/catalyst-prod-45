/**
 * For You Toolbar - Search, Sort, View, AI Toggle
 */

import React from 'react';
import { Search, ArrowUpDown, LayoutGrid, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForYouToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAIPanelOpen: boolean;
  onToggleAIPanel: () => void;
}

export function ForYouToolbar({
  searchQuery,
  onSearchChange,
  isAIPanelOpen,
  onToggleAIPanel,
}: ForYouToolbarProps) {
  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md flex-1 min-w-[240px] max-w-[520px]">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <span className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">
          ⌘K
        </span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface-0 rounded-md text-[13px] font-medium text-text-secondary cursor-pointer font-sans transition-all hover:bg-surface-hover">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface-0 rounded-md text-[13px] font-medium text-text-secondary cursor-pointer font-sans transition-all hover:bg-surface-hover">
          <LayoutGrid className="w-3.5 h-3.5" />
          View
        </button>
      </div>
    </div>
  );
}
