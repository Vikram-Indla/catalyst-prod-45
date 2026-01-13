// ============================================================
// PLANNER SIDEBAR COMPONENT
// Left navigation with views, insights, and presence
// Uses SidebarBase for consistent styling with other modules
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
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from '@/components/layout/SidebarBase';
import type { PlannerView } from '../types';

interface PlannerSidebarProps {
  activeView: PlannerView;
  onViewChange: (view: PlannerView) => void;
  onlineUsers?: { id: string; initials: string; color: string }[];
  insightsBadge?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Create sidebar config
const createPlannerSidebarConfig = (insightsBadge: number): SidebarConfig => ({
  badge: 'PL',
  label: 'Planner',
  sections: [
    {
      title: 'Views',
      items: [
        { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid },
        { id: 'task-list', title: 'Task List', path: '/planner/task-list', icon: List },
        { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare },
        { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar },
      ],
    },
    {
      title: 'Insights',
      items: [
        { id: 'weekly-report', title: 'Weekly Report', path: '/planner/weekly-report', icon: FileText },
        { id: 'team-performance', title: 'Team Performance', path: '/planner/team-performance', icon: Users },
        { id: 'ai-insights', title: 'AI Insights', path: '/planner/ai-insights', icon: Sparkles, badge: insightsBadge, badgeVariant: 'danger' as const },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/planner/settings',
    icon: Settings,
  },
});

export function PlannerSidebar({
  activeView,
  onViewChange,
  onlineUsers = [],
  insightsBadge = 0,
  collapsed = false,
  onToggleCollapse,
}: PlannerSidebarProps) {
  const config = createPlannerSidebarConfig(insightsBadge);
  
  return (
    <SidebarBase
      config={config}
      expanded={!collapsed}
      onToggle={onToggleCollapse || (() => {})}
    />
  );
}
