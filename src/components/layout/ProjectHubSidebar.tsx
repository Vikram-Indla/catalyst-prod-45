/**
 * ProjectHubSidebar — /project-hub sidebar using SidebarBase
 *
 * Two modes:
 * - Module nav (All Projects, Resource 360) when no project :key
 * - Project nav with PLANNING sections when inside a project
 */

import { useMemo } from 'react';
import {
  LayoutGrid,
  LayoutDashboard,
  Settings,
  UserSearch,
  Layers,
  LayoutList,
  BookOpen,
  GitBranch,
  FolderKanban,
  Columns3,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';
import { useProjectFavorites, useProjects } from '@/hooks/useProjectHub';

const preloaded = { done: false };
function preloadProjectHubChunks() {
  if (preloaded.done) return;
  preloaded.done = true;
  import('../../pages/project-hub/AllProjectsPage').catch(() => { preloaded.done = false; });
  import('../../pages/ResourceListingPage').catch(() => { preloaded.done = false; });
}

interface ProjectHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

function extractProjectKey(pathname: string): string | undefined {
  const match = pathname.match(/^\/project-hub\/([^/]+)/);
  if (!match) return undefined;
  const segment = match[1];
  if (['projects', 'resources', 'portfolio-health'].includes(segment)) return undefined;
  return segment;
}

export function ProjectHubSidebar({ expanded, onToggle, className }: ProjectHubSidebarProps) {
  const { pathname } = useLocation();
  const projectKey = extractProjectKey(pathname);
  const { data: favoriteIds = new Set<string>() } = useProjectFavorites();
  const { data: projects = [] } = useProjects();

  preloadProjectHubChunks();

  // Build favourites section items from starred projects
  const favouritesSection: SidebarSection | null = useMemo(() => {
    const favProjects = projects.filter(p => favoriteIds.has(p.id));
    if (favProjects.length === 0) return null;
    return {
      title: 'Favourites',
      items: favProjects.map(p => ({
        id: `fav-${p.id}`,
        title: p.name,
        path: `/project-hub/${p.project_key}/dashboard`,
        icon: FolderKanban,
        exact: false,
        alwaysStarred: true,
      })),
    };
  }, [projects, favoriteIds]);

  if (projectKey) {
    const base = `/project-hub/${projectKey}`;
    const projectConfig: SidebarConfig = {
      badge: projectKey.slice(0, 2).toUpperCase(),
      label: projectKey.toUpperCase(),
      showFavorites: false,
      sections: [
        {
          title: '',
          items: [
            { id: 'dashboard', title: 'Dashboard', path: `${base}/dashboard`, icon: LayoutDashboard, exact: false },
          ],
        },
        {
          title: 'Planning',
          items: [
            { id: 'story-backlog', title: 'Story Backlog', path: `${base}/story-backlog`, icon: BookOpen, exact: false },
            { id: 'epic-backlog', title: 'Epic Backlog', path: `${base}/epic-backlog`, icon: Layers, exact: false },
            { id: 'feature-backlog', title: 'Feature Backlog', path: `${base}/feature-backlog`, icon: LayoutList, exact: false },
            { id: 'hierarchy-allwork', title: 'All Work', path: `${base}/hierarchy/allwork`, icon: GitBranch, exact: false },
          ],
        },
        {
          title: 'Boards',
          items: [
            { id: 'boards', title: 'Board 29 — SS', path: `${base}/boards`, icon: Columns3, exact: false },
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
    return <SidebarBase config={projectConfig} expanded={expanded} onToggle={onToggle} className={className} />;
  }

  // Module-level: All Projects + Resource 360 + Portfolio Health + Favourites
  const sections: SidebarSection[] = [
    {
      title: '',
      items: [
        { id: 'all-projects', title: 'All Projects', path: '/project-hub/projects', icon: LayoutGrid, exact: false },
        { id: 'all-resources', title: 'Resource 360™', path: '/project-hub/resources', icon: UserSearch, exact: true },
      ],
    },
  ];

  if (favouritesSection) {
    sections.push(favouritesSection);
  }

  const moduleConfig: SidebarConfig = {
    badge: 'PH',
    label: 'ProjectHub',
    showFavorites: false,
    sections,
  };

  return <SidebarBase config={moduleConfig} expanded={expanded} onToggle={onToggle} className={className} />;
}
