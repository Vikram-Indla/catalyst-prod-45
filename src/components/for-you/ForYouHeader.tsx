/**
 * For You Page Header - Title and mode tabs
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
  { key: 'pln', label: 'Taskboard' },
];

export function ForYouHeader({ activeMode, onModeChange }: ForYouHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-[var(--text-1)]">For you</h1>

      <div 
        className={cn(
          "inline-flex items-center p-1 gap-1 rounded-[10px]",
          "bg-[var(--surface-muted)] border border-[var(--border-subtle-hex)]"
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
                "px-4 py-2 rounded-lg text-sm font-medium",
                "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-hex)]",
                isActive
                  ? "bg-[var(--brand-primary-hex)] text-white shadow-sm"
                  : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white/60 dark:hover:bg-white/5"
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
