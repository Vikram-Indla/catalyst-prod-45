// ============================================================
// IDEAS TAB BAR ADVANCED - World Class Design
// ============================================================

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

interface IdeasTabBarAdvancedProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function IdeasTabBarAdvanced({ tabs, activeTab, onTabChange, className }: IdeasTabBarAdvancedProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-slate-200 overflow-x-auto", className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium relative transition-colors whitespace-nowrap",
            activeTab === tab.id 
              ? "text-slate-900" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          <span className={cn(
            "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center",
            activeTab === tab.id
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500"
          )}>
            {tab.count}
          </span>
          
          {/* Active Indicator */}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}
