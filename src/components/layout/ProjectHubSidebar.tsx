/**
 * ProjectHubSidebar — /project-hub sidebar using SidebarBase
 *
 * Two modes:
 * - Module nav (All Projects, Resource 360) when no project :key
 * - Project nav with PLANNING / TRACKING / AI INTELLIGENCE sections when inside a project
 */

import { useMemo } from 'react';
import {
  LayoutGrid,
  LayoutDashboard,
  Activity,
  Settings,
  UserSearch,
  Layers,
  LayoutList,
  BookOpen,
  GitBranch,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useProjectFavorites, useProjects } from '@/hooks/useProjectHub';
import { useTheme } from '@/hooks/useTheme';

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

const BADGE_COLORS = ['#3B82F6', '#6366F1', '#0891B2', '#475569', '#0D9488', '#78716C'];
function getBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

const MODULE_NAV_CONFIG: SidebarConfig = {
  badge: 'PH',
  label: 'ProjectHub',
  showFavorites: false, // We render our own FAVOURITES section
  sections: [
    {
      title: '',
      items: [
        { id: 'all-projects', title: 'All Projects', path: '/project-hub/projects', icon: LayoutGrid, exact: false },
        { id: 'all-resources', title: 'Resource 360™', path: '/project-hub/resources', icon: UserSearch, exact: true },
        { id: 'portfolio-health', title: 'Portfolio Health', path: '/project-hub/portfolio-health', icon: Activity, exact: true },
      ],
    },
  ],
};

function extractProjectKey(pathname: string): string | undefined {
  const match = pathname.match(/^\/project-hub\/([^/]+)/);
  if (!match) return undefined;
  const segment = match[1];
  if (['projects', 'resources', 'portfolio-health'].includes(segment)) return undefined;
  return segment;
}

function FavouritesSection({ expanded }: { expanded: boolean }) {
  const { data: favoriteIds = new Set<string>() } = useProjectFavorites();
  const { data: projects = [] } = useProjects();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const favourites = useMemo(
    () => projects.filter(p => favoriteIds.has(p.id)),
    [projects, favoriteIds]
  );

  if (!expanded) return null;

  return (
    <div style={{ padding: '0 8px', marginTop: 8 }}>
      <div style={{ padding: '10px 10px 6px 10px' }}>
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            color: isDark ? 'rgba(245,243,240,0.45)' : 'rgba(15,23,42,0.45)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.8px',
            textTransform: 'uppercase' as const,
            lineHeight: 1,
          }}
        >
          Favourites
        </span>
      </div>
      {favourites.length === 0 ? (
        <div style={{ padding: '4px 10px', fontSize: 12, fontStyle: 'italic', color: isDark ? 'rgba(245,243,240,0.35)' : 'rgba(15,23,42,0.35)' }}>
          Star a project to add it here
        </div>
      ) : (
        favourites.map(p => {
          const badgeColor = getBadgeColor(p.id);
          const initials = p.project_key.substring(0, 2);
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
              className="flex w-full items-center gap-2.5 rounded-md transition-colors"
              style={{
                padding: '6px 10px',
                fontSize: 13,
                color: isDark ? 'rgba(245,243,240,0.72)' : 'var(--text-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(248,244,240,0.03)' : 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 20, height: 20, background: badgeColor, color: '#FFF', fontSize: 8, fontWeight: 700 }}
              >
                {initials}
              </div>
              <span className="truncate">{p.name}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

export function ProjectHubSidebar({ expanded, onToggle, className }: ProjectHubSidebarProps) {
  const { pathname } = useLocation();
  const projectKey = extractProjectKey(pathname);

  preloadProjectHubChunks();

  if (projectKey) {
    const base = `/project-hub/${projectKey}`;
    const projectConfig: SidebarConfig = {
      badge: projectKey.slice(0, 2).toUpperCase(),
      label: projectKey.toUpperCase(),
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
            { id: 'epic-backlog', title: 'Epic Backlog', path: `${base}/epic-backlog`, icon: Layers, exact: false },
            { id: 'feature-backlog', title: 'Feature Backlog', path: `${base}/feature-backlog`, icon: LayoutList, exact: false },
            { id: 'story-backlog', title: 'Story Backlog', path: `${base}/story-backlog`, icon: BookOpen, exact: false },
            { id: 'hierarchy', title: 'All Work Items', path: `${base}/hierarchy`, icon: GitBranch, exact: false },
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
      <SidebarBase config={projectConfig} expanded={expanded} onToggle={onToggle} className={className} />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <SidebarBase config={MODULE_NAV_CONFIG} expanded={expanded} onToggle={onToggle} className={className} />
      </div>
      {/* Render FAVOURITES section at module level */}
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0 }}>
        <FavouritesSection expanded={expanded} />
      </div>
    </div>
  );
}
