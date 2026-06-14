/* hmr-bust-2026-04-26 */
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
  Settings,
  Mic,
} from '@/lib/atlaskit-icons';
import {
  NavDashboardIcon,
  NavKanbanIcon,
  NavBacklogIcon,
  NavWorkIcon,
  NavFiltersIcon,
  NavTimelineIcon,
} from '@/lib/nav-icons';

import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { useLocation } from 'react-router-dom';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';
import { useProjectFavorites, useProjects } from '@/hooks/useProjectHub';
import { padProjectKey } from '@/lib/project-key';

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

  // Build favourites section items from starred projects.
  // Each item gets a ProjectIcon-based component so the real project avatar
  // (from /admin/icons or projects.avatar_url) shows instead of FolderKanban.
  const favouritesSection: SidebarSection | null = useMemo(() => {
    const favProjects = projects.filter(p => favoriteIds.has(p.id));
    if (favProjects.length === 0) return null;
    return {
      title: 'Favourites',
      items: favProjects.map(p => {
        const pk = p.project_key;
        const av = p.icon_avatar_url ?? null;
        const col = p.icon_color ?? null;
        const FavIcon = ({ className }: { className?: string }) => (
          <ProjectIcon projectKey={pk} avatarUrl={av} color={col} size="xsmall" className={className} />
        );
        return {
          id: `fav-${p.id}`,
          title: p.name,
          path: `/project-hub/${pk}/dashboard`,
          icon: FavIcon,
          exact: false,
          alwaysStarred: true,
        };
      }),
    };
  }, [projects, favoriteIds]);

  if (projectKey) {
    const base = `/project-hub/${projectKey}`;
    const project = projects.find(p => p.project_key === projectKey);
    const projectName = project?.name;
    const keyCode = padProjectKey(projectKey, projectName);

    const projectConfig: SidebarConfig = {
      badge: keyCode,
      label: projectName ?? keyCode,
      badgeProjectKey: projectKey,
      badgeProjectAvatarUrl: project?.icon_avatar_url ?? null,
      badgeProjectColor: project?.icon_color ?? null,
      showFavorites: false,
      // Design critique (2026-04-19): flattened from 3 sections ('', Boards,
      // Planning) to a single unlabeled group. Rationale:
      //   - "BOARDS" was tautological (one child: "Board").
      //   - "PLANNING" as a 2-item group under a single-item group flipped
      //     the hierarchy — labels implied more structure than existed.
      //   - Four items fit comfortably in a flat list; section headers earn
      //     their weight only once a group crosses ~4 children or the labels
      //     disambiguate overlapping verbs. Neither was true here.
      // If this list grows (e.g. Reports, Timeline, Releases are added),
      // reintroduce section headers then — not pre-emptively.
      sections: [
        {
          title: '',
          items: [
            { id: 'dashboard', title: 'Dashboard', path: `${base}/dashboard`, icon: NavDashboardIcon, exact: false },
            // Backlog sits directly after Dashboard (Vikram, 2026-06-14) — it is the
            // primary planning surface, so it leads the board/kanban views.
            { id: 'backlog', title: 'Backlog', path: `${base}/backlog`, icon: NavBacklogIcon, exact: false },
            { id: 'board', title: 'Board', path: `${base}/boards`, icon: NavKanbanIcon, exact: false },
            { id: 'kanban', title: 'Kanban', path: `${base}/kanban`, icon: NavKanbanIcon, exact: false },
            { id: 'allwork', title: 'Work', path: `${base}/allwork`, icon: NavWorkIcon, exact: false },
            { id: 'filters', title: 'Filters', path: `${base}/filters`, icon: NavFiltersIcon, exact: false },
            { id: 'timeline', title: 'Timeline', path: `${base}/timeline`, icon: NavTimelineIcon, exact: false },
            // Standups feature lives at /project-hub/:key/standups — past
            // standup sessions list (with AI summaries) and detail views.
            { id: 'standups', title: 'Standups', path: `${base}/standups`, icon: Mic, exact: false },
            // Story / Epic / Feature Backlog pages were removed — their scope
            // is fully covered by the unified Backlog view above. Routes now
            // redirect to /backlog; source files remain on disk as-is.
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

  return <ModuleLevelSidebar expanded={expanded} onToggle={onToggle} className={className} favouritesSection={favouritesSection} />;
}

/* ═══ Module-level sidebar ═══ */
function ModuleLevelSidebar({ expanded, onToggle, className, favouritesSection }: {
  expanded: boolean; onToggle: () => void; className?: string; favouritesSection: SidebarSection | null;
}) {
  const sections: SidebarSection[] = [
    {
      title: '',
      items: [
        { id: 'all-projects', title: 'All Projects', path: '/project-hub/projects', icon: LayoutGrid, exact: false },
      ],
    },
  ];

  if (favouritesSection) {
    sections.push(favouritesSection);
  }

  const moduleConfig: SidebarConfig = {
    badge: 'PH',
    label: 'Projects',
    showFavorites: false,
    sections,
  };

  return <SidebarBase config={moduleConfig} expanded={expanded} onToggle={onToggle} className={className} />;
}
