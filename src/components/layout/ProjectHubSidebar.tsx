/**
 * ProjectHubSidebar — /project-hub sidebar using SidebarBase
 *
 * Two modes:
 * - Module nav (All Projects, Resource 360) when no project :key
 * - Project nav with PLANNING / TRACKING / AI INTELLIGENCE sections when inside a project
 */

import {
  LayoutGrid,
  LayoutDashboard,
  AlignJustify,
  Columns3,
  GanttChart,
  BarChart3,
  Rocket,
  Sparkles,
  Activity,
  Settings,
  UserSearch,
  Kanban,
  Layers,
  LayoutList,
  BookOpen,
  GitBranch,
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
        { id: 'all-resources', title: 'Resource 360™', path: '/project-hub/resources', icon: UserSearch, exact: true },
      ],
    },
  ],
};

export function ProjectHubSidebar({ expanded, onToggle, className }: ProjectHubSidebarProps) {
  const params = useParams<{ key?: string }>();
  const projectKey = params.key;

  // If inside a project context, show project-specific nav with sections
  if (projectKey) {
    const base = `/project-hub/${projectKey}`;
    const projectConfig: SidebarConfig = {
      badge: projectKey.slice(0, 2).toUpperCase(),
      label: projectKey.toUpperCase(),
      sections: [
        {
          title: 'Planning',
          items: [
            { id: 'backlog',         title: 'Backlog',         path: `${base}/backlog`,         icon: Kanban,     exact: false },
            { id: 'epic-backlog',    title: 'Epic Backlog',    path: `${base}/epic-backlog`,    icon: Layers,     exact: false },
            { id: 'feature-backlog', title: 'Feature Backlog', path: `${base}/feature-backlog`, icon: LayoutList, exact: false },
            { id: 'story-backlog',   title: 'Story Backlog',   path: `${base}/story-backlog`,   icon: BookOpen,   exact: false },
            { id: 'hierarchy',       title: 'Hierarchy',       path: `${base}/hierarchy`,       icon: GitBranch,  exact: false },
          ],
        },
      ],
      footerItem: {
        id: 'settings',
        title: 'Settings',
        path: `${base}/settings`,
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
