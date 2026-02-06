/**
 * TaskHubSidebar — TaskHub module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Matches the PlannerSidebar navigation structure.
 */

import React from 'react';
import { 
  LayoutDashboard,
  LayoutGrid, 
  GanttChartSquare,
  Settings,
  CheckSquare,
  List,
  Layers,
  LucideProps,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TaskHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Custom "10" icon component that matches Lucide icon interface
const Priorities10Icon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, strokeWidth = 2, color = 'currentColor', ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        stroke="none"
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        10
      </text>
    </svg>
  )
);
Priorities10Icon.displayName = 'Priorities10Icon';

const taskHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'TaskHub',
  sections: [
    {
      title: '',
      items: [
        { id: 'dashboard', title: 'Task Overview', path: '/taskhub/dashboard', icon: LayoutDashboard, exact: true },
        { id: 'workstreams', title: 'Workstreams', path: '/taskhub/workstreams', icon: Layers, exact: true },
        { id: 'my-tasks', title: 'My Tasks', path: '/taskhub/my-tasks', icon: CheckSquare, exact: true },
        { id: 'boards', title: 'Task Board', path: '/taskhub/boards', icon: LayoutGrid, exact: true },
        { id: 'task-list', title: 'Task List', path: '/taskhub/task-list', icon: List, exact: true },
        { id: 'timeline', title: 'Task Timeline', path: '/taskhub/timeline', icon: GanttChartSquare, exact: true },
        {
          id: 'priorities',
          title: 'Priorities',
          path: '/priorities',
          icon: Priorities10Icon,
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
