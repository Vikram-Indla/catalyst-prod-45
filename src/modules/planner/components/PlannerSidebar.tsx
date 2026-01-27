// ============================================================
// PLANNER SIDEBAR COMPONENT
// Uses SidebarBase for consistent styling with other modules
// ============================================================

import { 
  LayoutDashboard,
  LayoutGrid, 
  List, 
  Calendar, 
  GanttChartSquare,
  FileText,
  Users,
  Settings,
  UsersRound,
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
          { id: 'my-tasks', title: 'My Tasks', path: '/my-tasks', icon: CheckSquare, exact: true },
        ],
      },
      {
        title: 'Views',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: '/planner/dashboard', icon: LayoutDashboard, exact: true },
          { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid, exact: true },
          { id: 'task-list', title: 'Task List', path: '/planner/task-list', icon: List, exact: true },
          { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare, exact: true },
          { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar, exact: true },
        ],
      },
      {
        title: 'Insights',
        items: [
          { id: 'workstream-performance', title: 'Daily Scorecard', path: '/planner/workstream-performance', icon: Users, exact: true },
          { id: 'weekly-report', title: 'Weekly Summary', path: '/planner/weekly-report', icon: FileText, exact: true },
          { id: 'ai-insights', title: 'Monthly Chronicle', path: '/planner/ai-insights', icon: FileText, exact: true },
        ],
      },
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
