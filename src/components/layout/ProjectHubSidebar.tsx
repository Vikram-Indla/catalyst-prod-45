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
import { useLocation } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';

// Eagerly preload ProjectHub page chunks when this sidebar mounts
// so clicking "All Projects" or "Resource 360™" is instant
const preloaded = { done: false };
function preloadProjectHubChunks() {
  if (preloaded.done) return;
  preloaded.done = true;
  import('../../pages/projecthub/AllProjectsPage').catch(() => { preloaded.done = false; });
  import('../../pages/ResourceListingPage').catch(() => { preloaded.done = false; });
}


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

/** Extract project key from pathname: /project-hub/:key/... */
function extractProjectKey(pathname: string): string | undefined {
  const match = pathname.match(/^\/project-hub\/([^/]+)/);
  if (!match) return undefined;
  const segment = match[1];
  // These are module-level routes, not project keys
  if (['projects', 'resources'].includes(segment)) return undefined;
  return segment;
}

export function ProjectHubSidebar({ expanded, onToggle, className }: ProjectHubSidebarProps) {
  const { pathname } = useLocation();
  const projectKey = extractProjectKey(pathname);

  // Preload page chunks as soon as ProjectHub sidebar renders
  preloadProjectHubChunks();

  // If inside a project context, show project-specific nav with sections
  if (projectKey) {
    const base = `/project-hub/${projectKey}`;
    const projectConfig: SidebarConfig = {
      badge: projectKey.slice(0, 2).toUpperCase(),
      label: projectKey.toUpperCase(),
      sections: [
        {
          title: '',
          items: [
            { id: 'dashboard',       title: 'Dashboard',       path: `${base}/dashboard`,       icon: LayoutDashboard, exact: false },
          ],
        },
        {
          title: 'Planning',
          items: [
            { id: 'epic-backlog',    title: 'Epic Backlog',    path: `${base}/epic-backlog`,    icon: Layers,     exact: false },
            { id: 'feature-backlog', title: 'Feature Backlog', path: `${base}/feature-backlog`, icon: LayoutList, exact: false },
            { id: 'story-backlog',   title: 'Story Backlog',   path: `${base}/story-backlog`,   icon: BookOpen,   exact: false },
            { id: 'hierarchy',       title: 'All Work Items', path: `${base}/hierarchy`,       icon: GitBranch,  exact: false },
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
