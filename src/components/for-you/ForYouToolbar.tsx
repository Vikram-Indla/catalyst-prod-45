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
    <div className="flex items-center justify-between mb-4 gap-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-0 border border-border rounded-md flex-1 max-w-[320px]">
        <Search className="w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-text-primary outline-none font-sans placeholder:text-text-muted"
        />
        <span className="px-1.5 py-0.5 bg-surface-muted rounded text-xs text-text-muted font-sans">
          ⌘K
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface-0 rounded-md text-[13px] font-medium text-text-secondary cursor-pointer font-sans transition-all hover:bg-surface-hover">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface-0 rounded-md text-[13px] font-medium text-text-secondary cursor-pointer font-sans transition-all hover:bg-surface-hover">
          <LayoutGrid className="w-3.5 h-3.5" />
          View
        </button>

        {/* AI Toggle - Modern Object */}
        <button
          onClick={onToggleAIPanel}
          title="AI Assistant"
          className={cn(
            "relative flex items-center justify-center w-10 h-10 border-none rounded-xl cursor-pointer",
            "bg-gradient-to-br from-status-success to-brand-primary",
            "shadow-[0_2px_8px_rgba(13,148,136,0.3)] transition-all",
            "hover:translate-y-[-2px] hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)]",
            isAIPanelOpen && "shadow-[0_0_0_3px_rgba(13,148,136,0.2),0_4px_16px_rgba(13,148,136,0.4)]"
          )}
        >
          <Zap className="w-5 h-5 text-white" />
          {/* Pulse indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface-0">
            <span className="absolute inset-[-2px] bg-green-500 rounded-full animate-ping opacity-50" />
          </span>
        </button>
      </div>
    </div>
  );
}
