/**
 * For You Sub Tabs - Worked on, Assigned, Starred
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TabType } from '@/hooks/useForYouData';

interface ForYouSubTabsProps {
  activeTab: TabType;
  counts: {
    worked: number;
    assigned: number;
    starred: number;
  };
  onTabChange: (tab: TabType) => void;
}

export function ForYouSubTabs({ activeTab, counts, onTabChange }: ForYouSubTabsProps) {
  const tabs = [
    { id: 'worked' as TabType, label: 'Worked on', count: counts.worked },
    { id: 'assigned' as TabType, label: 'Assigned', count: counts.assigned },
    { id: 'starred' as TabType, label: 'Starred', count: counts.starred },
  ];

  return (
    <div 
      className={cn(
        "inline-flex items-center p-1 gap-1 rounded-[10px]",
        "bg-[var(--surface-muted)] border border-[var(--border-subtle-hex)]"
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-hex)]",
              isActive
                ? "bg-[var(--brand-primary-hex)] text-white shadow-sm"
                : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white/60 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
            {/* Count badge - Catalyst V5 compliant */}
            <span
              className={cn(
                "min-w-[28px] h-[20px] px-2 rounded-[10px] text-xs font-semibold tabular-nums",
                "inline-flex items-center justify-center",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-[var(--surface-muted)] text-[var(--text-4)]"
              )}
            >
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
