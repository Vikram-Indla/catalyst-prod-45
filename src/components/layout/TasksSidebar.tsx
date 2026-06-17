/**
 * TasksSidebar — Tasks module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Matches the PlannerSidebar navigation structure.
 */

import React from 'react';
import {
  GanttChartSquare,
  Settings,
} from '@/lib/atlaskit-icons';
/* 2026-06-17: Dashboard + Board + Task List nav icons now use the
   canonical NavDashboardIcon / NavKanbanIcon / NavBacklogIcon from
   @/lib/nav-icons — same icons the project / product / incident hub
   sidebars use, so the glyph is identical across every hub's nav. */
import {
  NavDashboardIcon,
  NavKanbanIcon,
  NavBacklogIcon,
  NavWorkIcon,
  NavFiltersIcon,
} from '@/lib/nav-icons';
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
        { id: 'dashboard', title: 'Dashboard', path: '/tasks/overview', icon: NavDashboardIcon, exact: true },
        { id: 'boards', title: 'Board', path: '/tasks/board', icon: NavKanbanIcon, exact: true },
        { id: 'task-list', title: 'Task List', path: '/tasks/list', icon: NavBacklogIcon, exact: true },
        /* 2026-06-17: Work — canonical ProjectAllWorkView with tasksItems.
           Same UI shell as /project-hub/:key/allwork + /product-hub/:key/allwork
           + /incident-hub/work. */
        { id: 'work', title: 'Work', path: '/tasks/work', icon: NavWorkIcon, exact: false },
        /* 2026-06-17: Filters — canonical FiltersListPage hubType='tasks'.
           Same UI shell as other hubs' filter directories. Path
           /tasks/filters. exact: false so /tasks/filters/* (create, :id)
           also keeps this nav item highlighted. */
        { id: 'filters', title: 'Filters', path: '/tasks/filters', icon: NavFiltersIcon, exact: false },
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
