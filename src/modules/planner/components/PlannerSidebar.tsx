// ============================================================
// PLANNER SIDEBAR COMPONENT
// Uses SidebarBase for consistent styling with other modules
// Per Design Audit: Removed "Task List" (merged into My Tasks)
// Per Design Audit: Removed "Insights" section (not built yet)
// ============================================================

import { 
  LayoutDashboard,
  LayoutGrid, 
  Calendar, 
  GanttChartSquare,
  UsersRound,
  Settings,
  CheckSquare,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from '@/components/layout/SidebarBase';

interface PlannerSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function PlannerSidebar({ expanded, onToggle, className }: PlannerSidebarProps) {
  const plannerSidebarConfig: SidebarConfig = {
    badge: 'PL',
    label: 'Planner',
    sections: [
      {
        title: 'Personal',
        items: [
          { id: 'my-tasks', title: 'My Tasks', path: '/planner/my-tasks', icon: CheckSquare, exact: true },
        ],
      },
      {
        title: 'Views',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: '/planner/dashboard', icon: LayoutDashboard, exact: true },
          { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid, exact: true },
          // Task List removed - merged into My Tasks per audit
          { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare, exact: true },
          { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar, exact: true },
        ],
      },
      // Insights section removed until built per audit
      {
        title: 'Workspace',
        items: [
          { id: 'workstreams', title: 'Workstreams', path: '/planner/workstreams', icon: UsersRound, exact: true },
        ],
      },
    ],
    footerItem: { 
      id: 'settings', 
      title: 'Settings', 
      path: '/planner/settings', 
      icon: Settings, 
      exact: true 
    },
  };

  return (
    <SidebarBase
      config={plannerSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
