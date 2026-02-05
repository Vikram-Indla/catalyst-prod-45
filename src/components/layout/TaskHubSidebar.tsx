/**
 * TaskHubSidebar — TaskHub module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Matches the PlannerSidebar navigation structure.
 */

import { 
  LayoutDashboard,
  LayoutGrid, 
  GanttChartSquare,
  Settings,
  CheckSquare,
  List,
  Layers,
  Disc,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TaskHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const taskHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'TaskHub',
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
        {
          id: 'task10',
          title: (
            <span className="flex items-center gap-2">
              <span>Priorities</span>
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '9999px',
                  background: 'hsl(var(--brand-primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontSize: '11px',
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                10
              </span>
            </span>
          ),
          path: '/taskhub/task10',
          icon: Disc,
          exact: false,
        },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/taskhub/settings',
    icon: Settings,
    exact: true,
  },
};

export function TaskHubSidebar({ expanded, onToggle, className }: TaskHubSidebarProps) {
  return (
    <SidebarBase
      config={taskHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
