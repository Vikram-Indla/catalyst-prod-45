/**
 * HomeSidebar — personal command center on the / route.
 *
 * Renders three sections inside the canonical Catalyst SidebarBase so
 * Home shares the same visual language as every other hub rail
 * (StrategyHub, ProductHub, ProjectHub, …):
 *
 *   ┌─ Home (badge "H")  ──────────────────┐
 *   │  PINNED                              │
 *   │  ★ STORY-401  Riyadh launch          │
 *   │  ★ TASK-118   Q3 ramp memo           │
 *   ├─ RECENT ─────────────────────────────┤
 *   │  ⏱ Aramco rollout            2h      │
 *   │  ⏱ TestHub                   3d      │
 *   ├─ JUMP TO ────────────────────────────┤
 *   │  ▣ StrategyHub                       │
 *   │  ▣ ProductHub                        │
 *   │  ▣ ProjectHub                        │
 *   │  …                                   │
 *   └──────────────────────────────────────┘
 *
 * Why SidebarBase (not @atlaskit/side-navigation)
 * ───────────────────────────────────────────────
 *   The earlier draft used @atlaskit/side-navigation primitives, which
 *   gave us pure ADS components but visually diverged from the other
 *   panels (full-blue active fill + 3px accent bar, INTELLIGENCE-style
 *   uppercase section labels, 32px row height, Sora/Inter mix). The
 *   in-house SidebarBase is the canonical Catalyst pattern for every hub
 *   rail and renders the exact density / typography / active-state
 *   treatment Vikram showed in the Strategy Hub specimen. To unify Home
 *   with the rest of the platform, we now compose a SidebarConfig and
 *   delegate rendering to SidebarBase — single source of truth for rail
 *   styling.
 *
 * Pinned-row click behaviour
 * ──────────────────────────
 *   SidebarBase items navigate to `path` by default, but Pinned rows
 *   need to open the universal detail drawer (CatalystDetailRouter)
 *   instead. The Apr-2026 patch to SidebarBase added an optional
 *   `onClick` per item — when provided it takes precedence over
 *   `handleNavigation(path)`. Pinned rows wire this up to call
 *   `useGlobalSearchStore.openDetail()`. Recent rows use plain `path`
 *   navigation; Jump-to rows do the same.
 *
 * Recent rail (issues, not rooms — Apr 2026 rewrite)
 * ──────────────────────────────────────────────────
 *   The Recent section now surfaces *issues* the user is associated with
 *   (assignee or reporter), prioritized by operational urgency:
 *     1. Production Incident
 *     2. QA Bug / Defect / Bug
 *     3. Story / Feature
 *     4. everything else
 *   …and within each bucket, ordered by `jira_updated_at` desc. Each row
 *   shows the canonical `WorkItemIcon` (type-correct, color-locked per
 *   CLAUDE.md §11), the issue key as the row title, and a short relative
 *   timestamp on the right. Clicking a row opens the universal detail
 *   drawer via `useGlobalSearchStore.openDetail()` — no route navigation.
 *
 * Data sources (all real, user-scoped, no seed data)
 * ──────────────────────────────────────────────────
 *   Pinned   ← useStarredDeliveryItems()  (user_starred_items + ph_user_mapping)
 *   Recent   ← useRecentIssues()          (ph_issues, bucketed by type)
 *   Jump to  ← HUBS constant from @/lib/hubs (canonical CamelCase names)
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Clock,
  FolderOpen,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import {
  useStarredDeliveryItems,
  useToggleStar,
  type StarredItemType,
} from '@/hooks/home/useStarredItems';
import { useRecentProjects, type RecentProject } from '@/hooks/home/useRecentProjects';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { supabase } from '@/integrations/supabase/client';
import { ProjectIcon } from '@/components/shared/ProjectIcon';

const PINNED_LIMIT = 5;
const RECENT_PROJECTS_LIMIT = 6;

interface HomeSidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * Skeleton row — keeps row height stable while data lands.
 */
function SkeletonRowTitle() {
  return (
    <span
      style={{
        display: 'block',
        height: 12,
        width: '70%',
        borderRadius: 4,
        background: 'var(--ds-background-neutral, #F1F5F9)',
        opacity: 0.8,
      }}
      aria-hidden="true"
    />
  );
}


/**
 * Click-time pre-check — verify a starred item still resolves to a real
 * row before opening the detail drawer.
 *
 * Why this exists (Apr 2026 — "CEA-020 doesn't exist" incident)
 * ─────────────────────────────────────────────────────────────
 *   `useStarredDeliveryItems` self-heals orphan stars by fire-and-forget
 *   deleting any pin whose `item_id` failed to resolve in the four
 *   supported tables (see useStarredItems.ts H1B comment block). But the
 *   cleanup happens at fetch time — between the fetch and the next mount,
 *   the orphan still appears in the rail. If the user clicks it before
 *   the cleanup completes (or while the React Query cache is hot), the
 *   universal CatalystDetailRouter opens with no item and renders an
 *   empty drawer. This pre-check catches that race: we run a tiny HEAD
 *   query against the right table, and if the row is gone we synchronously
 *   unstar it + show a toast instead of opening a ghost drawer.
 *
 * Table routing
 * ─────────────
 *   story    → stories            (filter deleted_at IS NULL)
 *   feature  → features           (filter deleted_at IS NULL)
 *   epic     → epics              (filter deleted_at IS NULL)
 *   task     → work_manager_tasks (NO deleted_at column — hard delete only)
 *
 * Item types we don't yet support for resolution (incident,
 * business_request, theme, objective, dependency, risk) currently aren't
 * star-eligible from the home rail anyway, so we only handle the four
 * resolvable types and treat anything else as "exists" (best-effort —
 * better to open a possibly-empty drawer than block a legitimate click).
 */
async function verifyItemExists(
  itemId: string,
  itemType: StarredItemType,
): Promise<boolean> {
  try {
    if (itemType === 'task') {
      const { count, error } = await supabase
        .from('work_manager_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('id', itemId);
      if (error) throw error;
      return (count ?? 0) > 0;
    }
    if (itemType === 'story' || itemType === 'feature' || itemType === 'epic') {
      const table =
        itemType === 'story' ? 'stories' : itemType === 'feature' ? 'features' : 'epics';
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('id', itemId)
        .is('deleted_at', null);
      if (error) throw error;
      return (count ?? 0) > 0;
    }
    // Unknown type — be permissive, let the drawer try to render.
    return true;
  } catch (err) {
    // On a transient failure (auth race, RLS hiccup), be permissive — we
    // don't want a flaky network to wrongly auto-unstar a real pin.
    // eslint-disable-next-line no-console
    console.warn('[HomeSidebar] verifyItemExists failed; assuming exists', err);
    return true;
  }
}

/**
 * ProjectIcon adapter — renders the canonical 24px ProjectIcon (Jira-parity
 * branded square) inside SidebarBase's icon slot. SidebarBase forwards
 * `className` and `style` to the icon component; we wrap ProjectIcon in a
 * span so per-row tinting/sizing still applies. The icon itself stays at
 * 20px (slightly tighter than detail screens — rail is dense) and is
 * cached by projectKey so React reconciles by stable reference across
 * config rebuilds.
 */
const PROJECT_ICON_COMPONENTS = new Map<
  string,
  React.FC<{ className?: string; style?: React.CSSProperties }>
>();
function getProjectIconComponent(p: RecentProject) {
  const cacheKey = `${p.projectKey}|${p.iconName ?? ''}|${p.color ?? ''}`;
  let cached = PROJECT_ICON_COMPONENTS.get(cacheKey);
  if (!cached) {
    const Component: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
      className,
      style,
    }) => (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      >
        <ProjectIcon
          iconName={p.iconName}
          color={p.color}
          name={p.name}
          size="small"
        />
      </span>
    );
    Component.displayName = `ProjectIcon(${p.projectKey})`;
    PROJECT_ICON_COMPONENTS.set(cacheKey, Component);
    cached = Component;
  }
  return cached;
}

export default function HomeSidebar({
  expanded = true,
  onToggle = () => {},
  className,
}: HomeSidebarProps) {
  const navigate = useNavigate();
  const openDetail = useGlobalSearchStore((s) => s.openDetail);
  const toggleStar = useToggleStar();

  const { data: starredData, isLoading: starredLoading } = useStarredDeliveryItems();
  const { recentProjects, loading: recentLoading } = useRecentProjects(RECENT_PROJECTS_LIMIT);

  const handlePinnedClick = React.useCallback(
    async (item: { id: string; type: StarredItemType; projectKey: string }) => {
      const exists = await verifyItemExists(item.id, item.type);
      if (exists) {
        openDetail({
          id: item.id,
          itemType: item.type,
          projectKey: item.projectKey,
        });
        return;
      }
      toggleStar.mutate({
        itemId: item.id,
        itemType: item.type,
        isCurrentlyStarred: true,
      });
      toast.info('This item is no longer available — removed from Pinned.');
    },
    [openDetail, toggleStar],
  );

  const pinned = useMemo(
    () => (starredData?.items ?? []).slice(0, PINNED_LIMIT),
    [starredData],
  );

  const config: SidebarConfig = useMemo(() => {
    // Recent projects — Jira "Recent projects" parity. Project-grain only,
    // no ticket numbers; click navigates to the project's All Work view.
    const recentProjectItems: SidebarMenuItem[] = recentLoading
      ? [
          { id: 'recent-skel-1', title: <SkeletonRowTitle />, path: '#recent-skel-1', icon: FolderOpen },
          { id: 'recent-skel-2', title: <SkeletonRowTitle />, path: '#recent-skel-2', icon: FolderOpen },
          { id: 'recent-skel-3', title: <SkeletonRowTitle />, path: '#recent-skel-3', icon: FolderOpen },
        ]
      : recentProjects.length === 0
      ? [
          {
            id: 'recent-empty',
            title: (
              <span style={{ color: 'var(--ds-text-subtlest, #94A3B8)', fontSize: 13 }}>
                Open a project to see it here.
              </span>
            ),
            path: '#recent-empty',
            icon: Clock,
            onClick: () => {},
          },
        ]
      : recentProjects.map((p) => ({
          id: `recent-${p.projectKey}`,
          title: p.name,
          path: `/project-hub/${p.projectKey}/allwork`,
          icon: getProjectIconComponent(p),
        }));

    // "All projects" footer link — Jira "More spaces" parity.
    const allProjectsItem: SidebarMenuItem = {
      id: 'recent-all-projects',
      title: (
        <span
          style={{
            color: 'var(--ds-text-subtle, #626F86)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          All projects
        </span>
      ),
      path: '/project-hub/all-projects',
      icon: ArrowRight,
    };

    // Pinned section — preserved for ticket-level pins. Sits below
    // Recent projects (project-grain primary, ticket-grain secondary).
    const pinnedItems: SidebarMenuItem[] = starredLoading
      ? [
          { id: 'pinned-skel-1', title: <SkeletonRowTitle />, path: '#pinned-skel-1', icon: Star },
          { id: 'pinned-skel-2', title: <SkeletonRowTitle />, path: '#pinned-skel-2', icon: Star },
        ]
      : pinned.length === 0
      ? [
          {
            id: 'pinned-empty',
            title: (
              <span style={{ color: 'var(--ds-text-subtlest, #94A3B8)', fontSize: 13 }}>
                Nothing pinned yet.
              </span>
            ),
            path: '#pinned-empty',
            icon: Star,
            onClick: () => {},
          },
        ]
      : pinned.map((item) => ({
          id: `pinned-${item.id}`,
          title: item.key,
          path: `#pinned-${item.id}`,
          icon: Star,
          alwaysStarred: true,
          onClick: () => {
            void handlePinnedClick({
              id: item.id,
              type: item.type as StarredItemType,
              projectKey: item.projectKey,
            });
          },
          onStarClick: () => {
            toggleStar.mutate(
              {
                itemId: item.id,
                itemType: item.type as StarredItemType,
                isCurrentlyStarred: true,
              },
              {
                onSuccess: () => {
                  toast.success(`Unpinned ${item.key}`);
                },
                onError: (err) => {
                  // eslint-disable-next-line no-console
                  console.error('[HomeSidebar] unpin failed', err);
                  toast.error(`Could not unpin ${item.key}. Please try again.`);
                },
              },
            );
          },
        }));

    return {
      badge: 'H',
      label: 'Home',
      showFavorites: false,
      sections: [
        { title: 'Recent projects', items: [...recentProjectItems, allProjectsItem] },
        { title: 'Pinned items', items: pinnedItems },
      ],
    };
  }, [pinned, recentProjects, starredLoading, recentLoading, openDetail, handlePinnedClick, toggleStar, navigate]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}

