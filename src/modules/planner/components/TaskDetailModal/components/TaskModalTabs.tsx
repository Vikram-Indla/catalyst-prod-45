/**
 * Task Modal Tabs Component
 */

import React from 'react';

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TaskModalTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TaskModalTabs({ tabs, activeTab, onTabChange }: TaskModalTabsProps) {
  return (
    <div className="tabs-container">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
