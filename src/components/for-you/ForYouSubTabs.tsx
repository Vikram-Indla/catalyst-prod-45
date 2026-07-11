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
              fontSize: 'var(--ds-font-size-300)',
              transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
              cursor: 'pointer',
              border: isActive ? 'none' : '1px solid var(--ds-border)',
              background: isActive ? 'var(--ds-text-brand)' : 'transparent',
              color: isActive ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface-raised)))' : 'var(--ds-text-subtle)',
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
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'var(--ds-surface)' : 'var(--ds-background-neutral-subtle)',
                color: isActive ? 'var(--ds-text-brand)' : 'var(--ds-text-subtle)',
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
