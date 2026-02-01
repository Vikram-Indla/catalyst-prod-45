// ============================================================
// PLANNER SIDEBAR COMPONENT
// ============================================================

import { 
  LayoutDashboard,
  LayoutGrid, 
  GanttChartSquare,
  Settings,
  CheckSquare,
  List,
  Layers,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from '@/components/layout/SidebarBase';

interface PlannerSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function PlannerSidebar({ expanded, onToggle, className }: PlannerSidebarProps) {
  const plannerSidebarConfig: SidebarConfig = {
    badge: 'TH',
    label: 'Taskhub',
    sections: [
      {
        title: '',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: '/taskhub/dashboard', icon: LayoutDashboard, exact: true },
          { id: 'workstreams', title: 'Workstreams', path: '/taskhub/workstreams', icon: Layers, exact: true },
          { id: 'my-tasks', title: 'My Tasks', path: '/taskhub/my-tasks', icon: CheckSquare, exact: true },
          { id: 'boards', title: 'Boards', path: '/taskhub/boards', icon: LayoutGrid, exact: true },
          { id: 'task-list', title: 'Task List', path: '/taskhub/task-list', icon: List, exact: true },
          { id: 'timeline', title: 'Timeline', path: '/taskhub/timeline', icon: GanttChartSquare, exact: true },
          
        ],
      },
    ],
    footerItem: { 
      id: 'settings', 
      title: 'Settings', 
      path: '/taskhub/settings', 
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
