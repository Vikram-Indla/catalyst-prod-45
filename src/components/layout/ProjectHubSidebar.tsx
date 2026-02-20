/**
 * ProjectHubSidebar — /project-hub sidebar using SidebarBase
 *
 * Two modes:
 * - Module nav (All Projects, Resource 360) when no project :key
 * - Project nav (Dashboard, List, Board, etc.) when inside a project
 */

import {
  LayoutGrid,
  Users,
  LayoutDashboard,
  List,
  Columns3,
  AlignJustify,
  GanttChart,
  BarChart3,
  Settings,
  Star,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface ProjectHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const MODULE_NAV_CONFIG: SidebarConfig = {
  badge: 'PH',
  label: 'ProjectHub',
  sections: [
    {
      title: '',
      items: [
        { id: 'all-projects', title: 'All Projects', path: '/project-hub/projects', icon: LayoutGrid, exact: false },
        { id: 'resource360', title: 'Resource 360', path: '/project-hub/resource360', icon: Users, exact: false },
      ],
    },
    {
      title: 'FAVORITES',
      items: [
        // Placeholder — no starred projects by default
      ],
    },
  ],
};

export function ProjectHubSidebar({ expanded, onToggle, className }: ProjectHubSidebarProps) {
  const params = useParams<{ key?: string }>();
  const projectKey = params.key;

  // If inside a project context, show project-specific nav
  if (projectKey) {
    const projectConfig: SidebarConfig = {
      badge: projectKey.slice(0, 2).toUpperCase(),
      label: projectKey.toUpperCase(),
      items: [
        { id: 'dashboard', title: 'Dashboard', path: `/project-hub/${projectKey}/dashboard`, icon: LayoutDashboard, exact: true },
        { id: 'backlog', title: 'Backlog', path: `/project-hub/${projectKey}/backlog`, icon: List, exact: false },
        { id: 'board', title: 'Board', path: `/project-hub/${projectKey}/board`, icon: Columns3, exact: false },
        { id: 'list', title: 'List', path: `/project-hub/${projectKey}/list`, icon: AlignJustify, exact: false },
        { id: 'timeline', title: 'Timeline', path: `/project-hub/${projectKey}/timeline`, icon: GanttChart, exact: false },
        { id: 'reports', title: 'Reports', path: `/project-hub/${projectKey}/reports`, icon: BarChart3, exact: false },
      ],
      footerItem: {
        id: 'settings',
        title: 'Settings',
        path: `/project-hub/${projectKey}/settings`,
        icon: Settings,
        exact: true,
      },
    };

    return (
      <SidebarBase
        config={projectConfig}
        expanded={expanded}
        onToggle={onToggle}
        className={className}
      />
    );
  }

  // Module-level nav (All Projects, Resource 360)
  return (
    <SidebarBase
      config={MODULE_NAV_CONFIG}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
