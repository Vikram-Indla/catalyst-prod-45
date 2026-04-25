/**
 * ProjectHubSidebar — /project-hub sidebar using SidebarBase
 *
 * Two modes:
 * - Module nav (All Projects, Resource 360) when no project :key
 * - Project nav with PLANNING sections when inside a project
 */

import { useMemo, useState } from 'react';
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
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';
import { useProjectFavorites, useProjects } from '@/hooks/useProjectHub';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { useTheme } from '@/hooks/useTheme';

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
            { id: 'dashboard', title: 'Dashboard', path: `${base}/dashboard`, icon: LayoutDashboard, exact: false },
            // 2026-04-19: "Board" → "Project Board", "Backlog" → "Project
            // Backlog" per Vikram's call on the flattened layout. With no
            // section headers, the bare nouns read too thin against the
            // project header ("BA · BAU"); the "Project" prefix adds the
            // scope signal that the dropped section labels used to provide
            // and gives the sidebar visual ballast at this 4-item count.
            { id: 'board', title: 'Project Board', path: `${base}/boards`, icon: Columns3, exact: false },
            // Jira "List view" equivalent — unified, per-project. Combines
            // Epics, Features, Stories, Tasks, QA Bugs, Production Incidents,
            // Change Requests, Business Gaps, and API Requirements.
            { id: 'backlog', title: 'Project Backlog', path: `${base}/backlog`, icon: Layers, exact: false },
            // Jira "All work" equivalent — per-project, hierarchy view.
            // 2026-04-19: "All Work" → "Project Work" to match the
            // "Project Board" / "Project Backlog" naming cadence on the
            // flattened layout. Consistent prefix gives the 4-item list a
            // unified scope signal without needing a section header to
            // carry it.
            { id: 'allwork', title: 'Project Work', path: `${base}/allwork`, icon: GitBranch, exact: false },
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

/* ═══ Module-level sidebar with RECENTS ═══ */
function ModuleLevelSidebar({ expanded, onToggle, className, favouritesSection }: {
  expanded: boolean; onToggle: () => void; className?: string; favouritesSection: SidebarSection | null;
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [recentsExpanded, setRecentsExpanded] = useState(true);

  // Fetch global recent items (across all projects)
  const { data: recentItems = [] } = useQuery({
    queryKey: ['global-recent-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, entity_type, entity_id, entity_key, display_summary, nav_path, visited_at, project_id')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(10);
      if (error) { console.warn('global recents error:', error.message); return []; }
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const removeRecent = async (itemId: string) => {
    await supabase.from('user_recent_items').delete().eq('id', itemId);
  };

  const handleRecentClick = (item: typeof recentItems[0]) => {
    const { openDetail } = useGlobalSearchStore.getState();
    openDetail({ id: item.entity_id, itemType: item.entity_type as any });
  };

  const issueTypeColor = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes('bug') || lower.includes('defect')) return '#E5493A';
    if (lower.includes('story')) return '#63BA3C';
    if (lower.includes('epic')) return '#904EE2';
    return '#4BADE8';
  };

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

  const recentsSection = expanded && recentItems.length > 0 ? (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 1, background: isDark ? '#2E2E2E' : '#EBECF0', margin: '4px 12px 8px' }} />
      <button
        onClick={() => setRecentsExpanded(p => !p)}
        className="flex items-center w-full"
        style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', gap: 4 }}
      >
        <ChevronRight
          size={12}
          style={{ color: isDark ? '#7D7D7D' : '#6B778C', transform: recentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
        />
        <Clock size={12} style={{ color: isDark ? '#7D7D7D' : '#6B778C' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isDark ? '#7D7D7D' : '#6B778C' }}>
          Recents
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: isDark ? '#7D7D7D' : '#94A3B8', fontFamily: 'var(--ds-font-family-monospaced)' }}>
          {recentItems.length}
        </span>
      </button>

      {recentsExpanded && (
        <div style={{ padding: '2px 0' }}>
          {recentItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleRecentClick(item)}
              className="group"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px 5px 28px', cursor: 'pointer',
                borderRadius: 4, margin: '0 4px',
                transition: 'background 80ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1F1F1F' : '#F4F5F7'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: issueTypeColor(item.entity_type), flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#A1A1A1' : '#42526E', fontFamily: 'var(--ds-font-family-monospaced)', flexShrink: 0 }}>
                {item.entity_key}
              </span>
              <span style={{
                fontSize: 12, color: isDark ? '#A1A1A1' : '#172B4D', fontWeight: 450,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {item.display_summary}
              </span>
              <button
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); removeRecent(item.id); }}
                style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, color: isDark ? '#878787' : '#6B778C' }}
                title="Remove from recents"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return <SidebarBase config={moduleConfig} expanded={expanded} onToggle={onToggle} className={className}>{recentsSection}</SidebarBase>;
}
