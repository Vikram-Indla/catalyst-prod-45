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
  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Worked on - with badge */}
      <button
        onClick={() => onTabChange('worked')}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 border-none bg-transparent text-sm font-medium cursor-pointer",
          "font-sans rounded-full transition-all",
          activeTab === 'worked'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Worked on
        <span className={cn(
          "px-2 py-0.5 rounded-[10px] text-xs font-semibold",
          activeTab === 'worked'
            ? "bg-primary-foreground text-primary"
            : "bg-muted text-muted-foreground"
        )}>
          {counts.worked}
        </span>
      </button>

      {/* Assigned */}
      <button
        onClick={() => onTabChange('assigned')}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 border-none bg-transparent text-sm font-medium cursor-pointer",
          "font-sans rounded-full transition-all",
          activeTab === 'assigned'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Assigned
        <span className={cn(
          "text-muted-foreground font-normal",
          activeTab === 'assigned' && "text-primary-foreground/70"
        )}>
          {counts.assigned}
        </span>
      </button>

      {/* Starred */}
      <button
        onClick={() => onTabChange('starred')}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 border-none bg-transparent text-sm font-medium cursor-pointer",
          "font-sans rounded-full transition-all",
          activeTab === 'starred'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Starred
        <span className={cn(
          "text-muted-foreground font-normal",
          activeTab === 'starred' && "text-primary-foreground/70"
        )}>
          {counts.starred}
        </span>
      </button>
    </div>
  );
}
