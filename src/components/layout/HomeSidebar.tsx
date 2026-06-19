/**
 * HomeSidebar — personal command center on the / route.
 *
 *   ┌─ Home (badge "H")  ──────────────────────────┐
 *   │  Recent                                       │
 *   │  ▣ Senaei BAU › Backlog                       │
 *   │  ▣ Senaei BAU › Dashboard                     │
 *   │  ▣ ICP Project › Boards                       │
 *   └───────────────────────────────────────────────┘
 *
 * Per-location grain (Jira "Recent pages" parity)
 * ──────────────────────────────────────────────
 *   Each row is a project sub-page the user actually visited — not just
 *   the project. Senaei BAU Backlog and Senaei BAU Dashboard show as
 *   two separate rows so the user can jump straight back to the surface
 *   they were on. Project icon + name + section label, in that order.
 *
 *   Storage / ordering is delegated to `useRecentProjects` (v2 store,
 *   path-deduped, newest first, cap 8 here).
 *
 *   Excluded surfaces:
 *   - Tickets (story/issue/epic/feature) — never recorded.
 *   - Global hub roots (Product Hub, Test Hub) — those belong to the
 *     9-dot global hub switcher, not this rail.
 *   - "All projects" footer link — removed (project-hub/all-projects is
 *     not a project, surfacing it was misleading).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import FolderOpenIcon from '@atlaskit/icon/core/folder-open';
import BacklogIcon from '@atlaskit/icon/glyph/backlog';
import BoardIcon from '@atlaskit/icon/glyph/board';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import DashboardIcon from '@atlaskit/icon/glyph/dashboard';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import ListIcon from '@atlaskit/icon/glyph/list';
import RoadmapIcon from '@atlaskit/icon/glyph/roadmap';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import SidebarClock from './SidebarClock';
import { useRecentProjects, type RecentLocation } from '@/hooks/home/useRecentProjects';
import { HUB_ICON_OUTLINE_REGISTRY } from '@/components/icons';
import { sliceVisible } from '@/lib/home-recents';

const RECENT_LIMIT = 16;

/**
 * Collapse state persists across reloads so a folded space stays folded.
 * Stored as a JSON array of group keys (`hub:projectKey`). Session-only
 * "show all" (the +N more fold) deliberately does NOT persist — it is a
 * transient peek, not a preference.
 */
const COLLAPSE_STORAGE_KEY = 'catalyst.home.recents.collapsed.v1';

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsed(s: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode / quota — collapse just won't persist */
  }
}

interface HomeSidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

// Hub navigation items for collapsed sidebar (HOME route only)
const HUB_NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/for-you' },
  { key: 'strategy', label: 'Strategy Hub', href: '/strategyhub' },
  { key: 'ideation', label: 'Ideation', href: '/ideation/backlog' },
  { key: 'product', label: 'Product Hub', href: '/product-hub' },
  { key: 'project', label: 'Project Hub', href: '/project-hub' },
  { key: 'release', label: 'Release Hub', href: '/release-hub/overview' },
  { key: 'test', label: 'Test Hub', href: '/testhub/dashboard' },
  { key: 'incident', label: 'Incident Hub', href: '/incident-hub' },
  { key: 'task', label: 'Tasks', href: '/tasks/overview' },
  { key: 'plan', label: 'Plan Hub', href: '/planhub' },
  { key: 'wiki', label: 'Wiki', href: '/wiki' },
] as const;

/** Skeleton row — keeps row height stable while data lands. */
function SkeletonRowTitle() {
  return (
    <span
      style={{
        display: 'block',
        height: 12,
        width: '70%',
        borderRadius: 4,
        background: 'var(--ds-background-neutral, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))',
        opacity: 0.8,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Format a timestamp (milliseconds since epoch) as relative time.
 * Examples: "2h ago", "30m ago", "Yesterday", "Oct 5"
 */
function formatTimestamp(visitedAtMs: number): string {
  const now = Date.now();
  const diffMs = now - visitedAtMs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older entries, show month/day
  const date = new Date(visitedAtMs);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Row title — single line within a space group (2026-06-17 space-grouped redesign).
 *
 *   [section glyph]  Section name ………………………… time chip
 *
 * The project identity now lives in the group header (SpaceGroupHeader), so the
 * row no longer repeats the project key. Each row carries only what
 * distinguishes it WITHIN its space: the section name (primary) and when it was
 * last opened (subtlest, right-aligned). This is the Alt B "spaces, not
 * timestamps" model — time is demoted from a section axis to a quiet chip.
 *
 * ADS tokens used:
 *   color.text          (#292A2E)  — section name (primary)
 *   color.text.subtlest (#626F86)  — timestamp (tertiary)
 *   font.size.100       (14px)     — body
 *   font.size.050       (11px)     — micro/labels
 * Source: https://atlassian.design/foundations/typography
 *         https://atlassian.design/foundations/color
 */
function LocationRowTitle({ location }: { location: RecentLocation }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* Section name — the destination, primary weight */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: token('color.text', '#292A2E'),
          fontWeight: 500,
          fontSize: token('font.size.100', '14px'),
          lineHeight: '20px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {location.sectionLabel}
      </span>

      {/* Timestamp — subtlest, pushed to the right edge */}
      <span
        style={{
          flexShrink: 0,
          color: token('color.text.subtlest', '#626F86'),
          fontWeight: 400,
          fontSize: token('font.size.050', '11px'),
          lineHeight: '16px',
        }}
      >
        {formatTimestamp(location.visitedAt)}
      </span>
    </span>
  );
}

/**
 * Space group header — neutral hub glyph + name, rendered once above the group's
 * rows. Uses the monochrome hub-outline mask (theme-aware) for every space type;
 * project/product identity is carried by the name + "· Project/Product" label,
 * not a colourful brand tile (2026-06-19 sidebar de-noise decision — reverses the
 * prior colour-tile / canonical-brand-avatar treatment for THIS surface only).
 *
 * Generous vertical padding (12px top) separates each space without a hairline
 * divider — the enterprise "calm whitespace" read requested 2026-06-17.
 */
function SpaceGroupHeader({
  head,
  isCollapsed,
  onToggle,
}: {
  head: RecentLocation;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  // Space-scoped hubs (project/product) carry a per-space KEY → show "KEY · Type".
  // Global single hubs (task/incident/release/plan) have no key → type word only.
  const isSpaceScoped = head.hub === 'project' || head.hub === 'product';
  // Neutral monochrome hub-outline glyph for every space — identity is carried by
  // the name + "· Project/Product" label, not a colourful tile. Mask-filled so the
  // single glyph is theme-aware (no baked-in stroke colour). 2026-06-19 de-noise.
  const outlineUrl =
    HUB_ICON_OUTLINE_REGISTRY[head.hub as keyof typeof HUB_ICON_OUTLINE_REGISTRY];
  const iconMask = outlineUrl ? `url(${outlineUrl})` : undefined;

  // Whole header is the collapse affordance. The chevron sits left of the
  // avatar (Jira "Recent" group-header pattern) and rotates open→down /
  // closed→right. Neutral chevron tone — color stays reserved for the avatar.
  const Chevron = isCollapsed ? ChevronRightIcon : ChevronDownIcon;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${head.projectName}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        padding: `${token('space.150', '12px')} ${token('space.150', '12px')} ${token('space.075', '6px')} ${token('space.150', '12px')}`,
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{ flexShrink: 0, display: 'inline-flex', marginLeft: -4 }}
      >
        <Chevron label="" size="small" primaryColor="var(--ds-text-subtle, #44546F)" />
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          display: 'block',
          backgroundColor: 'var(--ds-text-subtle, #44546F)',
          WebkitMaskImage: iconMask,
          maskImage: iconMask,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
      <span
        title={head.projectName}
        style={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'baseline',
          gap: token('space.050', '4px'),
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            color: token('color.text', '#292A2E'),
            fontWeight: 500,
            fontSize: token('font.size.100', '14px'),
            lineHeight: '20px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isSpaceScoped ? head.projectKey : head.projectName}
        </span>
        {isSpaceScoped && (
          <span
            style={{
              flexShrink: 0,
              color: token('color.text.subtlest', '#626F86'),
              fontWeight: 400,
              fontSize: token('font.size.075', '12px'),
              lineHeight: '20px',
            }}
          >
            · {head.hub === 'product' ? 'Product' : 'Project'}
          </span>
        )}
      </span>
    </div>
  );
}

// ─── Section-type icon map ────────────────────────────────────────────────────
// Recent rows use a small neutral Atlaskit glyph matching the PAGE TYPE, not
// the project avatar. Project avatars are colorful tiles that create visual
// noise when used as a list icon — page-type icons are muted and scannable.
//
// Design rationale: Jira's "Recent" list uses page-type icons (backlog icon
// for backlog, board icon for boards, etc.) not project avatar tiles.
// This reduces color clutter while preserving the navigational signal.

type SectionIconType = React.ComponentType<{ label: string; size?: string; primaryColor?: string }>;

const SECTION_ICON_MAP: Record<string, SectionIconType> = {
  dashboard: DashboardIcon as unknown as SectionIconType,
  overview: DashboardIcon as unknown as SectionIconType,
  backlog: BacklogIcon as unknown as SectionIconType,
  'epic-backlog': BacklogIcon as unknown as SectionIconType,
  'feature-backlog': BacklogIcon as unknown as SectionIconType,
  'story-backlog': BacklogIcon as unknown as SectionIconType,
  boards: BoardIcon as unknown as SectionIconType,
  board: BoardIcon as unknown as SectionIconType,
  allwork: ListIcon as unknown as SectionIconType,
  list: ListIcon as unknown as SectionIconType,
  calendar: CalendarIcon as unknown as SectionIconType,
  timeline: RoadmapIcon as unknown as SectionIconType,
  filters: FilterIcon as unknown as SectionIconType,
};

function getSectionIcon(section: string): SectionIconType {
  return SECTION_ICON_MAP[section] ?? (ListIcon as unknown as SectionIconType);
}

function SectionIconWrapper({ section, color }: { section: string; color?: string | null }) {
  const Icon = getSectionIcon(section);
  return (
    <Icon
      label=""
      size="small"
      primaryColor={color ?? 'var(--ds-text-subtle, #44546F)'}
    />
  );
}

// ─── Space-grouping helper ────────────────────────────────────────────────────

interface SpaceGroup {
  key: string;
  head: RecentLocation;
  items: RecentLocation[];
}

/**
 * Group locations by space (hub:projectKey), preserving most-recently-visited-
 * space-first order (recentLocations arrives newest-first). Within a space,
 * sections stay in visit order. This is the top-level organising axis of the
 * Alt B redesign — replaces the former Today/Yesterday/Day-before time buckets.
 */
function groupIntoSpaces(locs: RecentLocation[]): SpaceGroup[] {
  const order: string[] = [];
  const groups = new Map<string, RecentLocation[]>();
  for (const loc of locs) {
    const k = `${loc.hub}:${loc.projectKey}`;
    if (!groups.has(k)) { groups.set(k, []); order.push(k); }
    groups.get(k)!.push(loc);
  }
  return order.map((k) => {
    const items = groups.get(k)!;
    return { key: k, head: items[0], items };
  });
}

export default function HomeSidebar({
  expanded = true,
  onToggle = () => {},
  className,
}: HomeSidebarProps) {
  const navigate = useNavigate();
  const { recentLocations, loading } = useRecentProjects(RECENT_LIMIT);

  // Per-space display state. `collapsed` (persisted) hides a group's rows.
  // Rows are hard-capped at 3 per group (no expand fold) — see slice below.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCollapsed(next);
      return next;
    });
  }, []);

  const config: SidebarConfig = useMemo(() => {
    if (!expanded) {
      // Collapsed HOME route: render hub icons with outline styling
      const hubItems: SidebarMenuItem[] = HUB_NAV_ITEMS.map((hub) => ({
        id: `hub-${hub.key}`,
        title: hub.label,
        tooltip: hub.label,
        path: hub.href,
        icon: ({ style }: { className?: string; style?: React.CSSProperties } = {}) => {
          // Mask-fill the outline asset so the icon inherits a theme-aware
          // colour instead of the baked-in #44546F stroke. <img> bakes its
          // colour into the file and cannot respond to dark mode. SidebarBase's
          // renderMenuItem passes the active-aware ADS colour via style.color
          // (var(--ds-icon-brand) when active, var(--ds-icon) when inactive) —
          // honouring it keeps the rail in step with every other sidebar icon
          // and gives active hubs the brand-blue fill for free.
          const maskUrl = `url(${HUB_ICON_OUTLINE_REGISTRY[hub.key as keyof typeof HUB_ICON_OUTLINE_REGISTRY]})`;
          return (
            <span
              role="img"
              aria-label={hub.label}
              style={{
                width: '24px',
                height: '24px',
                display: 'block',
                backgroundColor: style?.color ?? 'var(--ds-icon, #172B4D)',
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
            />
          );
        },
      }));

      return {
        badge: null,
        label: 'Home',
        showFavorites: false,
        items: hubItems,
      };
    }

    if (loading) {
      return {
        badge: null,
        label: 'Home',
        showFavorites: false,
        sections: [{
          title: 'Recent',
          items: [
            {
              id: 'recent-loading-label',
              title: (
                <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontSize: '11px' }}>
                  Loading recent pages...
                </span>
              ),
              path: '#recent-loading-label',
              icon: FolderOpenIcon,
              onClick: () => {},
            },
            { id: 'recent-skel-1', title: <SkeletonRowTitle />, path: '#recent-skel-1', icon: FolderOpenIcon },
            { id: 'recent-skel-2', title: <SkeletonRowTitle />, path: '#recent-skel-2', icon: FolderOpenIcon },
            { id: 'recent-skel-3', title: <SkeletonRowTitle />, path: '#recent-skel-3', icon: FolderOpenIcon },
          ],
        }],
      };
    }

    if (recentLocations.length === 0) {
      return {
        badge: null,
        label: 'Home',
        showFavorites: false,
        sections: [{
          title: 'Recent',
          items: [{
            id: 'recent-placeholder',
            title: (
              <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontSize: '12px' }}>
                No recent pages
              </span>
            ),
            path: '#',
            icon: ClockIcon,
            onClick: (e) => e.preventDefault(),
          }],
        }],
      };
    }

    // Space-grouped Recents (Alt B, 2026-06-17): top-level axis is the space
    // (project/product/Tasks), not a time bucket. The hook already family-dedupes
    // and orders newest-first, so each section's rows are unique and ordered.
    const toItem = (loc: RecentLocation): SidebarMenuItem => ({
      id: `recent-${loc.path}`,
      title: <LocationRowTitle location={loc} />,
      tooltip: `${loc.sectionLabel} — ${loc.projectKey}`,
      path: loc.path,
      // Functional nav icons are NEUTRAL — color is reserved for the project
      // avatar (identity) and the active row (orientation). Was loc.color
      // (uniform blue), which made every icon shout and diverged from the
      // neutral collapsed rail (2026-06-18 sidebar color architecture).
      icon: () => <SectionIconWrapper section={loc.section} />,
    });

    const sections = groupIntoSpaces(recentLocations).map((group) => {
      const isCollapsed = collapsed.has(group.key);
      const header = (
        <SpaceGroupHeader
          head={group.head}
          isCollapsed={isCollapsed}
          onToggle={() => toggleCollapsed(group.key)}
        />
      );

      if (isCollapsed) {
        // Header only — SidebarBase keeps the section alive via its titleNode.
        return { title: group.head.projectName, titleNode: header, items: [] };
      }

      // Hard cap of 3 rows per space — no "+N more" fold. Vikram 2026-06-18:
      // each module shows at most its 3 most-recent rooms, no expand chip.
      const { visible } = sliceVisible(group.items, false);
      const items: SidebarMenuItem[] = visible.map(toItem);

      return { title: group.head.projectName, titleNode: header, items };
    });

    return {
      badge: null,
      label: 'Home',
      showFavorites: false,
      hideSectionDividers: true,
      sectionsHeading: 'Recent',
      sections,
    };
  }, [recentLocations, loading, expanded, collapsed, toggleCollapsed]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      footerSlot={<SidebarClock expanded={expanded} />}
    />
  );
}
