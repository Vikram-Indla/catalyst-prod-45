import { cn } from '@/lib/utils';
import { List, PieChart } from 'lucide-react';
import type { DrawerTab } from '@/types/resource360';

interface Resource360TabsProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
}

export function Resource360Tabs({ activeTab, onTabChange }: Resource360TabsProps) {
  const tabs: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'hierarchy', label: 'Hierarchy Tree', icon: <List className="w-4 h-4" /> },
    { id: 'sunburst', label: 'Sunburst View', icon: <PieChart className="w-4 h-4" /> },
  ];

  return (
    <div className="px-6 border-b border-[#e5e5e5]">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3",
              "text-sm font-medium rounded-t-lg transition-all",
              activeTab === tab.id
                ? "bg-[#2563eb] text-white"
                : "text-[#737373] hover:bg-[#f5f5f4]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
