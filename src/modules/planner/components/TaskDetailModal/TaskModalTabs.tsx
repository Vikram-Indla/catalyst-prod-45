// ============================================================
// TASK MODAL TABS
// Tab buttons with optional badge
// ============================================================

import React from 'react';
import type { TaskTab } from './types';

interface TaskModalTabsProps {
  tabs: TaskTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TaskModalTabs: React.FC<TaskModalTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
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
};
