/**
 * For You Toolbar - Search, Sort, View (CATALYST10 v3 spec)
 */

import React from 'react';
import { Search, ArrowUpDown, LayoutGrid } from 'lucide-react';
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
      {/* Search Input — 32px height, 7px radius, focus ring */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 h-8 bg-white border border-[hsl(214,32%,91%)] rounded-[7px] flex-1 min-w-[240px] max-w-[520px]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150",
        "focus-within:border-[hsl(217,91%,60%)] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
      )}>
        <Search className="w-3.5 h-3.5 text-[hsl(215,20%,65%)] shrink-0" />
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-[13px] text-[hsl(222,47%,11%)] outline-none placeholder:text-[hsl(215,20%,65%)]"
        />
        <span className="px-1.5 py-0.5 bg-[hsl(210,40%,96%)] border border-[hsl(214,32%,91%)] rounded text-[10px] font-semibold text-[hsl(215,20%,65%)]">
          ⌘K
        </span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 h-8 border border-[hsl(214,32%,91%)] bg-white rounded-[7px] text-[13px] font-medium text-[hsl(215,25%,27%)] cursor-pointer transition-all hover:bg-[hsl(210,40%,96%)]">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>

        <button className="flex items-center gap-1.5 px-3 h-8 border border-[hsl(214,32%,91%)] bg-white rounded-[7px] text-[13px] font-medium text-[hsl(215,25%,27%)] cursor-pointer transition-all hover:bg-[hsl(210,40%,96%)]">
          <LayoutGrid className="w-3.5 h-3.5" />
          View
        </button>
      </div>
    </div>
  );
}
