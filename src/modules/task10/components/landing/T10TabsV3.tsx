// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10TabsV3
// Purpose: Tab navigation for This Week / Completed / Archived views
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '@/lib/utils';

export type T10TabId = 'this-week' | 'completed' | 'archived';

interface T10TabsV3Props {
  activeTab: T10TabId;
  onTabChange: (tab: T10TabId) => void;
  completedCount?: number;
  archivedCount?: number;
}

export function T10TabsV3({ 
  activeTab, 
  onTabChange, 
  completedCount = 0,
  archivedCount = 0 
}: T10TabsV3Props) {
  const tabs: { id: T10TabId; label: string; badge?: number }[] = [
    { id: 'this-week', label: 'This Week' },
    { id: 'completed', label: 'Completed', badge: completedCount > 0 ? completedCount : undefined },
    { id: 'archived', label: 'Archived', badge: archivedCount > 0 ? archivedCount : undefined },
  ];

  return (
    <div className="t10-tabs-container">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "t10-tab-button",
            activeTab === tab.id && "t10-tab-button--active"
          )}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className={cn(
              "t10-tab-badge",
              tab.id === 'archived' && "t10-tab-badge--warning"
            )}>
              {tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="t10-tab-indicator" />
          )}
        </button>
      ))}
    </div>
  );
}
