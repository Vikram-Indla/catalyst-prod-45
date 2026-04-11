/**
 * BacklogSubTabs — All / My Items / Starred
 * Matches ForYouSubTabs pill-style pattern exactly.
 * Theme-aware via cp-* tokens.
 */

import React from 'react';

export type BacklogTabType = 'all' | 'my' | 'starred';

interface BacklogSubTabsProps {
  activeTab: BacklogTabType;
  counts: Record<BacklogTabType, number>;
  onTabChange: (tab: BacklogTabType) => void;
}

const TABS: Array<{ id: BacklogTabType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'my', label: 'My Items' },
  { id: 'starred', label: 'Starred' },
];

export function BacklogSubTabs({ activeTab, counts, onTabChange }: BacklogSubTabsProps) {
  return (
    <div className="inline-flex items-center gap-2" role="tablist">
      {TABS.map((tab) => {
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
              border: isActive ? 'none' : '1px solid var(--cp-border-default)',
              background: isActive ? 'var(--cp-primary-60)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--cp-text-secondary)',
              fontWeight: isActive ? 600 : 500,
              outline: 'none',
              fontFamily: 'var(--cp-font-body)',
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
                background: isActive ? 'rgba(255,255,255,0.9)' : 'var(--cp-interact-hover)',
                color: isActive ? 'var(--cp-primary-60)' : 'var(--cp-text-tertiary)',
              }}
            >
              {counts[tab.id] > 999 ? '999+' : counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
