// ============================================================================
// ORGANISM: TabsBar — Tab navigation
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';
import { TabButton } from '../molecules';
import { Tab, TabId } from '../types';

interface TabsBarProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <div
      style={{
        display: 'flex',
        padding: '0 28px',
        borderBottom: `1px solid ${COLORS.borderLight}`,
        backgroundColor: COLORS.surfaceCard,
        overflowX: 'auto'
      }}
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          label={tab.label}
          isActive={activeTab === tab.id}
          badge={tab.badge}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
};

export default TabsBar;
