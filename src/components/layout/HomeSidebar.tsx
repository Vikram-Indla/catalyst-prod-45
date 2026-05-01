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
 * Adapter — render <WorkItemIcon> with the SidebarBase icon-prop
 * contract:
 *   icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
 *
 * SidebarBase forwards `className` and `style` to the icon component; we
 * pass them through to a wrapper <span> so SidebarBase's per-row
 * tinting/sizing (which targets the wrapper) still applies. The
 * WorkItemIcon SVG itself stays at 16px and uses the canonical color
 * locked per CLAUDE.md §11 — we deliberately do NOT thread `currentColor`
 * through it because the work-item icon palette is non-semantic and must
 * not invert in dark mode (CLAUDE.md §11: "color variation for dark mode"
 * is banned).
 *
 * Components are cached by `type` at module level so React can reconcile
 * by stable reference across HomeSidebar renders. Without this cache,
 * every config rebuild would mint a fresh component identity and force
 * the SidebarBase row to remount.
 */
const WORK_ITEM_ICON_COMPONENTS = new Map<
  WorkItemIconType,
  React.FC<{ className?: string; style?: React.CSSProperties }>
>();
function getWorkItemIconComponent(type: WorkItemIconType) {
  let cached = WORK_ITEM_ICON_COMPONENTS.get(type);
  if (!cached) {
    const Component: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
      className,
      style,
    }) => (
      <span className={className} style={{ display: 'inline-flex', ...style }}>
        <WorkItemIcon type={type} size={16} />
      </span>
    );
    Component.displayName = `WorkItemIcon(${type})`;
    WORK_ITEM_ICON_COMPONENTS.set(type, Component);
    cached = Component;
  }
  return cached;
}

export default function HomeSidebar({
  expanded = true,
  onToggle = () => {},
  className,
}: HomeSidebarProps) {
  const openDetail = useGlobalSearchStore((s) => s.openDetail);
  const toggleStar = useToggleStar();

  const { data: starredData, isLoading: starredLoading } = useStarredDeliveryItems();
  const { recentIssues, loading: recentLoading } = useRecentIssues({ limit: RECENT_LIMIT });

  /**
   * Pinned-row click handler — pre-checks existence, then either opens
   * the detail drawer or auto-unstars + toasts. Runs async; the click
   * itself is fire-and-forget (no spinner, no awaiting in the JSX), which
   * keeps the rail responsive. The brief perceptible delay between click
   * and drawer (one HEAD round-trip, ~50–150ms) is acceptable given the
   * alternative (an empty drawer for a ghost pin).
   */
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
      // Ghost pin — silently unstar and notify. Mutation invalidates
      // ['starred-delivery-items'] so the row vanishes from the rail.
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
  const recent = useMemo(
    () => recentIssues.slice(0, RECENT_LIMIT),
    [recentIssues],
  );

  const config: SidebarConfig = useMemo(() => {
    // Pinned section — fall back to skeleton rows during load so the rail
    // doesn't reflow when data lands.
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
              <span style={{ color: 'var(--cp-text-muted, #94A3B8)', fontSize: 13 }}>
                Nothing pinned yet.
              </span>
            ),
            // Empty state shouldn't navigate anywhere — onClick is a no-op.
            path: '#pinned-empty',
            icon: Star,
            onClick: () => {},
          },
        ]
      : pinned.map((item) => ({
          id: `pinned-${item.id}`,
          title: item.key,
          // Path is a placeholder — onClick takes precedence and opens the
          // universal detail drawer instead of navigating to a route.
          path: `#pinned-${item.id}`,
          icon: Star,
          alwaysStarred: true,
          // Pre-check existence before opening; auto-unstar + toast if
          // the item has been deleted since it was pinned.
          onClick: () => {
            void handlePinnedClick({
              id: item.id,
              type: item.type as StarredItemType,
              projectKey: item.projectKey,
            });
          },
          // Star override — Pinned rows live in user_starred_items, not
          // the SidebarBase path-favorites store. Clicking the filled
          // star unpins via useToggleStar (the same mutation Star
          // buttons elsewhere call) and shows a confirming toast.
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

    const recentItems: SidebarMenuItem[] = recentLoading
      ? [
          { id: 'recent-skel-1', title: <SkeletonRowTitle />, path: '#recent-skel-1', icon: Clock },
          { id: 'recent-skel-2', title: <SkeletonRowTitle />, path: '#recent-skel-2', icon: Clock },
        ]
      : recent.length === 0
      ? [
          {
            id: 'recent-empty',
            title: (
              <span style={{ color: 'var(--cp-text-muted, #94A3B8)', fontSize: 13 }}>
                No recent issues.
              </span>
            ),
            path: '#recent-empty',
            icon: Clock,
            onClick: () => {},
          },
        ]
      : recent.map((issue: RecentIssue) => {
          // Use the canonical normalizer from WorkItemIcon (CLAUDE.md §11
          // single-source-of-truth). It covers more cases than a local
          // mapper would (service_request, problem, prod_issue,
          // production_issue, user_story, improvement, technical_task)
          // and console.warns on any unknown type so we surface gaps.
          const iconType = normalizeIconType(issue.issueType);
          // Diagnostic — surface raw issue_type → resolved iconType so we
          // can see in DevTools whether normalizeIconType is missing a
          // mapping (e.g., a custom MoIM Jira type). Remove once the
          // Recent-icon mismatch is verified resolved.
          // eslint-disable-next-line no-console
          if (typeof console !== 'undefined') {
            console.debug(
              '[HomeSidebar.Recent]',
              issue.issueKey,
              'issue_type=',
              JSON.stringify(issue.issueType),
              '→ iconType=',
              iconType,
            );
          }
          return {
            id: `recent-${issue.id}`,
            title: (
              <RecentRowTitle
                issueKey={issue.issueKey}
                when={new Date(issue.updatedAt)}
              />
            ),
            // Path is a placeholder — onClick takes precedence and opens
            // the universal detail drawer instead of navigating.
            path: `#recent-${issue.id}`,
            icon: getWorkItemIconComponent(iconType as WorkItemIconType),
            onClick: () =>
              openDetail({
                id: issue.id,
                projectKey: issue.projectKey,
              }),
          };
        });

    const jumpToItems: SidebarMenuItem[] = HUBS.map((hub) => ({
      id: `jump-${hub.id}`,
      title: hub.label,
      path: hub.path,
      icon: HUB_ICONS[hub.id] ?? FolderOpen,
    }));

    return {
      badge: 'H',
      label: 'Home',
      // Disable the per-item star affordance — Pinned items already render
      // a filled star, and recent / jump rows aren't star-eligible.
      showFavorites: false,
      sections: [
        { title: 'Pinned', items: pinnedItems },
        { title: 'Recent', items: recentItems },
        { title: 'Jump to', items: jumpToItems },
      ],
    };
  }, [pinned, recent, starredLoading, recentLoading, openDetail, handlePinnedClick, toggleStar]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
