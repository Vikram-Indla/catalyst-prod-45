/**
 * For You Sub Tabs - Worked on, Assigned, Starred (CATALYST10 v3 spec)
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
    <div className="inline-flex items-center gap-2" role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-[20px] text-[13px]",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(217,91%,60%)]",
              isActive
                ? "font-semibold bg-[hsl(217,91%,60%)] text-white shadow-sm"
                : "font-medium text-[hsl(215,25%,27%)] border border-[hsl(214,32%,91%)] hover:bg-[hsl(210,40%,96%)]"
            )}
          >
            {tab.label}
            {/* Count badge */}
            <span
              className={cn(
                "min-w-[22px] h-[18px] px-1.5 rounded-[10px] text-[11px] font-bold tabular-nums",
                "inline-flex items-center justify-center",
                isActive
                  ? "bg-white text-[hsl(217,91%,60%)]"
                  : "bg-[hsl(210,40%,96%)] text-[hsl(215,16%,47%)]"
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
