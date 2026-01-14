// ============================================================
// PLANNER SIDEBAR COMPONENT
// Uses SidebarBase for consistent styling with other modules
// ============================================================

import { 
  LayoutGrid, 
  List, 
  Calendar, 
  GanttChartSquare,
  FileText,
  Users,
  Settings,
  UsersRound,
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
        title: 'Views',
        items: [
          { id: 'boards', title: 'Boards', path: '/planner/boards', icon: LayoutGrid, exact: true },
          { id: 'task-list', title: 'Task List', path: '/planner/task-list', icon: List, exact: true },
          { id: 'timeline', title: 'Timeline', path: '/planner/timeline', icon: GanttChartSquare, exact: true },
          { id: 'calendar', title: 'Calendar', path: '/planner/calendar', icon: Calendar, exact: true },
        ],
      },
      {
        title: 'Insights',
        items: [
          { id: 'daily-scorecard', title: 'Daily Scorecard', path: '/planner/daily-scorecard', icon: Users, exact: true },
          { id: 'weekly-summary', title: 'Weekly Summary', path: '/planner/weekly-summary', icon: FileText, exact: true },
          { id: 'monthly-chronicle', title: 'Monthly Chronicle', path: '/planner/monthly-chronicle', icon: FileText, exact: true },
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
