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
  { key: 'pln', label: 'Planner' },
];

export function ForYouHeader({ activeMode, onModeChange }: ForYouHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-text-primary">For you</h1>

      <div className="flex items-center">
        {MODE_TABS.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => onModeChange(tab.key)}
            className={cn(
              "px-5 py-2 border-none bg-transparent text-sm font-medium cursor-pointer transition-all",
              "font-sans",
              index === 0 && "rounded-l-md",
              index === MODE_TABS.length - 1 && "rounded-r-md",
              activeMode === tab.key
                ? "bg-brand-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
