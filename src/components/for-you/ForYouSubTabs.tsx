/**
 * For You Sub Tabs - Worked on, Assigned, Starred · Theme-aware
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
              cursor: 'pointer',
              border: isActive ? 'none' : '1px solid var(--cp-bd)',
              background: isActive ? 'var(--cp-blue)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--cp-t2)',
              fontWeight: isActive ? 600 : 500,
              outline: 'none',
            }}
          >
            {tab.label}
            <span
              style={{
                minWidth: 22,
                height: 18,
                padding: '0 6px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'rgba(255,255,255,0.9)' : 'var(--cp-hover)',
                color: isActive ? 'var(--cp-blue-text)' : 'var(--cp-t3)',
              }}
            >
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
