// ============================================================
// PLANNER SIDEBAR COMPONENT
// Uses SidebarBase for consistent styling with other modules
// Flat menu structure: Dashboard, My Tasks, Boards, Task List, Timeline, Calendar, Workstreams
// ============================================================

import { 
  LayoutDashboard,
  LayoutGrid, 
  Calendar, 
  GanttChartSquare,
  UsersRound,
  Settings,
  CheckSquare,
  List,
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
        title: '', // No section title for flat list
        items: [
          { id: 'dashboard', title: 'Dashboard', path: '/planner/dashboard', icon: LayoutDashboard, exact: true },
          { id: 'my-tasks', title: 'My Tasks', path: '/planner/my-tasks', icon: CheckSquare, exact: true },
          { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid, exact: true },
          { id: 'task-list', title: 'Task List', path: '/planner/task-list', icon: List, exact: true },
          { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare, exact: true },
          { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar, exact: true },
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
