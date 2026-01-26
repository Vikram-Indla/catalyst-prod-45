/**
 * Department filter tabs with counts
 * Catalyst V5 ring-fenced pill design
 */

import { cn } from '@/lib/utils';

interface DepartmentTab {
  id: string;
  name: string;
  count: number;
}

interface AnalyticsDepartmentTabsProps {
  tabs: DepartmentTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function AnalyticsDepartmentTabs({ tabs, activeTab, onTabChange }: AnalyticsDepartmentTabsProps) {
  return (
    <div className="analytics-dept-filters">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'analytics-dept-pill',
              isActive && 'active'
            )}
          >
            {tab.name} ({tab.count})
          </button>
        );
      })}
    </div>
  );
}
