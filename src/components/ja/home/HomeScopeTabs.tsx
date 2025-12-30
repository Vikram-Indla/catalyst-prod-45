// src/components/ja/home/HomeScopeTabs.tsx
// Catalyst V5 Segmented Control - Blue + Teal design system
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
        // Segmented control container: rounded with subtle muted background
        "inline-flex items-center p-1 gap-1 rounded-[10px]",
        "bg-[var(--surface-muted)] border border-[var(--border-subtle-hex)]",
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
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              // Focus ring
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-hex)]",
              isActive
                // Active: white card background with shadow
                ? "bg-[var(--bg-card)] text-[var(--text-1)] shadow-sm border border-[var(--border-subtle-hex)]"
                // Inactive: transparent, muted text
                : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white/60 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
            {/* Count badge - teal when active per Catalyst V5 spec */}
            <span
              className={cn(
                // Badge: rounded pill with centered text
                "min-w-[28px] h-[20px] px-2 rounded-[10px] text-xs font-semibold tabular-nums",
                "inline-flex items-center justify-center",
                isActive
                  // Active count: teal badge (--brand-teal #0d9488)
                  ? "bg-[var(--status-success)] text-white"
                  // Inactive count: muted badge
                  : "bg-[var(--surface-muted)] text-[var(--text-4)]"
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
