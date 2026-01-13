// ============================================================
// PLANNER SIDEBAR COMPONENT
// Left navigation with views, insights, and presence
// ============================================================

import { 
  LayoutGrid, 
  List, 
  Calendar, 
  GanttChartSquare,
  FileText,
  Users,
  Sparkles,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerView } from '../types';

interface PlannerSidebarProps {
  activeView: PlannerView;
  onViewChange: (view: PlannerView) => void;
  onlineUsers?: { id: string; initials: string; color: string }[];
  insightsBadge?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const VIEWS_SECTION = [
  { id: 'boards' as const, label: 'Boards', icon: LayoutGrid },
  { id: 'task-list' as const, label: 'Task List', icon: List },
  { id: 'timeline' as const, label: 'Timeline', icon: GanttChartSquare },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
];

const INSIGHTS_SECTION = [
  { id: 'weekly-report' as const, label: 'Weekly Report', icon: FileText },
  { id: 'team-performance' as const, label: 'Team Performance', icon: Users },
  { id: 'ai-insights' as const, label: 'AI Insights', icon: Sparkles, hasBadge: true },
];

export function PlannerSidebar({
  activeView,
  onViewChange,
  onlineUsers = [],
  insightsBadge = 0,
  collapsed = false,
  onToggleCollapse,
}: PlannerSidebarProps) {
  return (
    <aside 
      className={cn(
        "flex flex-col border-r border-border bg-surface-0 transition-all duration-300",
        collapsed ? "w-16" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">PL</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-text-primary">Planner</span>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-surface-2 text-text-muted"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Views Section */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Views
            </span>
          )}
        </div>
        <nav className="space-y-0.5 px-2">
          {VIEWS_SECTION.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Insights Section */}
        <div className="px-3 py-2 mt-4">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Insights
            </span>
          )}
        </div>
        <nav className="space-y-0.5 px-2">
          {INSIGHTS_SECTION.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.hasBadge && insightsBadge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                        {insightsBadge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Online Now Section */}
        {!collapsed && onlineUsers.length > 0 && (
          <div className="mt-6 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Online Now
            </span>
            <div className="flex items-center gap-1 mt-2">
              {onlineUsers.slice(0, 4).map(user => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: user.color }}
                  title={user.initials}
                >
                  {user.initials}
                </div>
              ))}
              {onlineUsers.length > 4 && (
                <span className="text-xs text-text-muted ml-1">
                  +{onlineUsers.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => onViewChange('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
