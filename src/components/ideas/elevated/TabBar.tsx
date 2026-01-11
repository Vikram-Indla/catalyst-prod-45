// ============================================================
// TAB BAR - Notion Style Tabs with Counts
// ============================================================

import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  count?: number;
  icon?: string; // Emoji
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onTabChange, className }: TabBarProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 border-b border-slate-200",
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              activeTab === tab.key
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            )}>
              {tab.count}
            </span>
          )}
          
          {/* Active indicator */}
          {activeTab === tab.key && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
}
