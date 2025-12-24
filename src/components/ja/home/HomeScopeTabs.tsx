// src/components/ja/home/HomeScopeTabs.tsx
// Unified scope tabs component - IDENTICAL across all modes
// Tabs: Worked on | Assigned | Starred with count pills

import * as React from 'react';
import { cn } from '@/lib/utils';

export type HomeScopeValue = 'worked-on' | 'assigned' | 'starred';

export interface HomeScopeTabsCounts {
  workedOn: number;
  assigned: number;
  starred: number;
}

interface HomeScopeTabsProps {
  value: HomeScopeValue;
  onChange: (value: HomeScopeValue) => void;
  counts: HomeScopeTabsCounts;
  className?: string;
}

const SCOPE_TABS: { value: HomeScopeValue; label: string; countKey: keyof HomeScopeTabsCounts }[] = [
  { value: 'worked-on', label: 'Worked on', countKey: 'workedOn' },
  { value: 'assigned', label: 'Assigned', countKey: 'assigned' },
  { value: 'starred', label: 'Starred', countKey: 'starred' },
];

export function HomeScopeTabs({ value, onChange, counts, className }: HomeScopeTabsProps) {
  return (
    <div
      className={cn(
        // Container: rounded pill group with dark translucent background
        "inline-flex items-center p-1 rounded-lg gap-0.5",
        "bg-[var(--surface-2)] border border-[var(--border-color)]",
        className
      )}
      role="tablist"
      aria-label="Work scope"
    >
      {SCOPE_TABS.map((tab) => {
        const isActive = value === tab.value;
        const count = counts[tab.countKey];

        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              // Base styles: padding, rounded, font, transition
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              // Focus ring
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              isActive
                // Active: brighter surface + crisp text
                ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm"
                // Inactive: muted text
                : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]"
            )}
          >
            {tab.label}
            {/* Count pill - always show for consistency */}
            <span
              className={cn(
                // Small rounded pill with slight contrast, centered vertically
                "min-w-[18px] h-[18px] px-1 rounded text-[11px] font-medium tabular-nums",
                "inline-flex items-center justify-center",
                isActive
                  // Active count: slightly brighter badge
                  ? "bg-[var(--surface-3)] text-[var(--text-1)]"
                  // Inactive count: muted badge
                  : "bg-[var(--surface-3)]/50 text-[var(--text-3)]"
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
