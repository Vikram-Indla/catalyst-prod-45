// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10Tabs
// Purpose: Tab-based filters (replaces chunky dropdown filters)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';

export type T10TabValue = 'all' | 'active' | 'completed' | 'archived';

interface T10TabsProps {
  activeTab: T10TabValue;
  onTabChange: (tab: T10TabValue) => void;
  counts: {
    active: number;
    completed: number;
  };
}

export function T10Tabs({ activeTab, onTabChange, counts }: T10TabsProps) {
  const tabs: { value: T10TabValue; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'completed', label: 'Completed', count: counts.completed },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="t10-tabs">
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          className={`t10-tab ${activeTab === tab.value ? 't10-tab-active' : ''}`}
          onClick={() => {
            onTabChange(tab.value);
            console.log('[T10] Tab changed:', tab.value);
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="t10-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default T10Tabs;
