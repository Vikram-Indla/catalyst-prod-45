/**
 * TasksSidebar — Tasks module sidebar using SidebarBase
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
  List,
} from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { ContextSwitcher } from './ContextSwitcher';

interface TasksSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const taskHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'Tasks',
  // Design critique (2026-04-19): stripped redundant "Task" prefix from
  // items where the hub badge ("TH / Tasks") already provides context.
  //   "Task Overview" → "Overview"
  //   "Task Board"    → "Board"
  //   "Task Timeline" → "Timeline"
  // Kept on "My Tasks" (possessive — adds meaning) and "Task List" (leaving
  // "List" alone reads as too generic in a flat list).
  sections: [
    {
      title: '',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/tasks/overview', icon: LayoutDashboard, exact: true },
        { id: 'boards', title: 'Board', path: '/tasks/board', icon: LayoutGrid, exact: true },
        { id: 'task-list', title: 'Task List', path: '/tasks/list', icon: List, exact: true },
        { id: 'timeline', title: 'Timeline', path: '/tasks/timeline', icon: GanttChartSquare, exact: true },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/tasks/settings',
    icon: Settings,
    exact: true,
  },
};

export function TasksSidebar({ expanded, onToggle, className }: TasksSidebarProps) {
  return (
    <SidebarBase
      config={taskHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      renderHeaderSwitcher={(exp) => <ContextSwitcher variant="sidebar" expanded={exp} />}
    />
  );
}
