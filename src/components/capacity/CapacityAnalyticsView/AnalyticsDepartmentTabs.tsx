/**
 * Department filter tabs with counts
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
    <div className="flex items-center gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              isActive
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            )}
          >
            {tab.name} ({tab.count})
          </button>
        );
      })}
    </div>
  );
}
