/**
 * For You Page Header - Title and mode tabs (CATALYST10 v3 spec)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { ModeFilter } from '@/hooks/useForYouData';

interface ForYouHeaderProps {
  activeMode: ModeFilter;
  onModeChange: (mode: ModeFilter) => void;
}

const MODE_TABS: { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ops', label: 'Operations' },
  { key: 'del', label: 'Delivery' },
  { key: 'tsk', label: 'TaskHub' },
];

export function ForYouHeader({ activeMode, onModeChange }: ForYouHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      {/* Page title — 20px/700 slate-900 */}
      <h1 className="text-[20px] font-bold text-[hsl(222,47%,11%)] tracking-[-0.03em]">
        For you
      </h1>

      <div 
        className={cn(
          "inline-flex items-center p-1 gap-1 rounded-[10px]",
          "bg-[hsl(210,40%,96%)] border border-[hsl(214,32%,91%)]"
        )}
        role="tablist"
      >
        {MODE_TABS.map((tab) => {
          const isActive = activeMode === tab.key;
          
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onModeChange(tab.key)}
              className={cn(
                "px-4 py-2 rounded-[7px] text-[13px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(217,91%,60%)]",
                isActive
                  ? "font-semibold bg-[hsl(217,91%,60%)] text-white shadow-sm"
                  : "font-medium text-[hsl(215,25%,27%)] hover:text-[hsl(222,47%,11%)] hover:bg-white/60"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
