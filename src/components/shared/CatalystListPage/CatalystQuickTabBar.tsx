/**
 * CatalystQuickTabBar — underline tab bar with a right-side action slot.
 *
 * Matches Jira's Filters directory tab pattern:
 *   [All filters] [My filters] [Starred]          [+ Create filter]
 *
 * Reusable for any list page that needs quick-filter tabs + a primary CTA.
 * Each tab is identified by a string id; the active tab gets a 2px brand
 * blue underline (Jira-exact: border-bottom on the button, marginBottom -1
 * to overlap the container's bottom border so there's no gap).
 */
import React from 'react';
import { token } from '@atlaskit/tokens';

export interface QuickTab {
  id: string;
  label: string;
}

interface CatalystQuickTabBarProps {
  tabs: QuickTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Slot for right-side actions — e.g., a primary "Create" button. */
  actions?: React.ReactNode;
}

export function CatalystQuickTabBar({
  tabs,
  activeTab,
  onTabChange,
  actions,
}: CatalystQuickTabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '0 24px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: isActive
                ? `2px solid ${token('color.border.selected', 'var(--ds-link, #0052CC)')}`
                : '2px solid transparent',
              padding: '8px 16px',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? token('color.text.selected', 'var(--ds-link, #0052CC)')
                : token('color.text.subtle'),
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        );
      })}
      {actions && (
        <div style={{ marginLeft: 'auto' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
