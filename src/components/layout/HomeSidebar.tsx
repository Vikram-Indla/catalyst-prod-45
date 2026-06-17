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
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import FolderOpenIcon from '@atlaskit/icon/core/folder-open';
import BacklogIcon from '@atlaskit/icon/glyph/backlog';
import BoardIcon from '@atlaskit/icon/glyph/board';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import DashboardIcon from '@atlaskit/icon/glyph/dashboard';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import ListIcon from '@atlaskit/icon/glyph/list';
import RoadmapIcon from '@atlaskit/icon/glyph/roadmap';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import { useRecentProjects, type RecentLocation } from '@/hooks/home/useRecentProjects';
import { HUB_ICON_OUTLINE_REGISTRY } from '@/components/icons';

const RECENT_LIMIT = 16;

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
  { key: 'release', label: 'Release Hub', href: '/release-hub/command-center' },
  { key: 'test', label: 'Test Hub', href: '/testhub/dashboard' },
  { key: 'incident', label: 'Incident Hub', href: '/incident-hub' },
  { key: 'task', label: 'Tasks', href: '/tasks/board' },
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
 * Title renderer — ADS split-hierarchy layout (2026-05-28 identity redesign).
 *
 * Two-line structure with clear typographic weight separation:
 *   Line 1: Section name — dominant (14px/500/color.text)
 *   Line 2: Project key (left) + Timestamp (right) — subordinate meta
 *
 * Design rationale:
 * - "All work" is what you want to jump back to — it's the PRIMARY identifier
 * - "BAU" is WHICH project — already implied by context, shown as quiet meta
 * - "7h ago" is WHEN — useful for recency scanning, pushed right so it
 *    doesn't compete with the destination name
 * - No "›" separator — the two-line vertical split IS the hierarchy;
 *   symbols that encode structure Tufte-style add zero data-ink value
 *
 * ADS tokens used:
 *   color.text          (#292A2E)  — section name (primary)
 *   color.text.subtle   (#44546F)  — project key (secondary)
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
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0,
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* Line 1: Section name — the destination, primary weight */}
      <span
        style={{
          color: token('color.text', '#292A2E'),
          fontWeight: 500,
          // ADS font.size.100 = 14px body
          // Source: https://atlassian.design/foundations/typography
          fontSize: token('font.size.100', '14px'),
          lineHeight: '18px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {location.sectionLabel}
      </span>

      {/* Line 2: Project key (left) + Timestamp (right) — context meta */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 0,
          marginTop: 0,
        }}
      >
        {/* Project key — subtle, secondary context */}
        <span
          style={{
            color: token('color.text.subtle', '#44546F'),
            fontWeight: 400,
            // ADS font.size.050 = 11px micro/rail labels
            // Source: https://atlassian.design/foundations/typography
            fontSize: token('font.size.050', '11px'),
            lineHeight: '16px',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {location.projectKey}
        </span>

        {/* Timestamp — subtlest, pushed to right edge */}
        <span
          style={{
            color: token('color.text.subtlest', '#626F86'),
            fontWeight: 400,
            // ADS font.size.050 = 11px
            fontSize: token('font.size.050', '11px'),
            lineHeight: '16px',
            flexShrink: 0,
            paddingLeft: token('space.050', '4px'),
          }}
        >
          {formatTimestamp(location.visitedAt)}
        </span>
      </span>
    </span>
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
      primaryColor={color ?? 'var(--ds-icon-subtle, #626F86)'}
    />
  );
}

// ─── Time-bucketing helpers ───────────────────────────────────────────────────

type TimeBucket = 'today' | 'yesterday' | 'day-before' | 'older';

function timeBucket(visitedAt: number): TimeBucket {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const t = todayStart.getTime();
  if (visitedAt >= t) return 'today';
  if (visitedAt >= t - dayMs) return 'yesterday';
  if (visitedAt >= t - 2 * dayMs) return 'day-before';
  return 'older';
}

const BUCKET_LABELS: Record<TimeBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'day-before': 'Day before',
  older: 'Older',
};

const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'day-before', 'older'];

/** Group locations by space (hub:key) preserving the most-recent-space-first
 *  ordering, so within a time bucket same-space entries cluster together. */
function groupBySpace(locs: RecentLocation[]): RecentLocation[] {
  const order: string[] = [];
  const groups = new Map<string, RecentLocation[]>();
  for (const loc of locs) {
    const k = `${loc.hub}:${loc.projectKey}`;
    if (!groups.has(k)) { groups.set(k, []); order.push(k); }
    groups.get(k)!.push(loc);
  }
  return order.flatMap((k) => groups.get(k)!);
}

export default function HomeSidebar({
  expanded = true,
  onToggle = () => {},
  className,
}: HomeSidebarProps) {
  const navigate = useNavigate();
  const { recentLocations, loading } = useRecentProjects(RECENT_LIMIT);

  const config: SidebarConfig = useMemo(() => {
    if (!expanded) {
      // Collapsed HOME route: render hub icons with outline styling
      const hubItems: SidebarMenuItem[] = HUB_NAV_ITEMS.map((hub) => ({
        id: `hub-${hub.key}`,
        title: hub.label,
        tooltip: hub.label,
        path: hub.href,
        icon: () => (
          <img
            src={HUB_ICON_OUTLINE_REGISTRY[hub.key as keyof typeof HUB_ICON_OUTLINE_REGISTRY]}
            alt={hub.label}
            style={{
              width: '24px',
              height: '24px',
              display: 'block',
            }}
          />
        ),
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

    // Group locations into time buckets, then cluster same-space entries within each bucket.
    const bucketMap = new Map<TimeBucket, RecentLocation[]>();
    for (const loc of recentLocations) {
      const b = timeBucket(loc.visitedAt);
      if (!bucketMap.has(b)) bucketMap.set(b, []);
      bucketMap.get(b)!.push(loc);
    }

    // Cross-bucket dedup: Today owns any path — suppress same path from older buckets.
    // A path in Today is removed from Yesterday/DayBefore/Older so each entry appears once.
    const seenPaths = new Set<string>();
    for (const b of BUCKET_ORDER) {
      const locs = bucketMap.get(b);
      if (!locs) continue;
      const filtered = locs.filter((loc) => !seenPaths.has(loc.path));
      filtered.forEach((loc) => seenPaths.add(loc.path));
      if (filtered.length === 0) bucketMap.delete(b);
      else bucketMap.set(b, filtered);
    }

    const toItem = (loc: RecentLocation): SidebarMenuItem => ({
      id: `recent-${loc.path}`,
      title: <LocationRowTitle location={loc} />,
      tooltip: `${loc.sectionLabel} — ${loc.projectKey}`,
      path: loc.path,
      icon: () => <SectionIconWrapper section={loc.section} color={loc.color} />,
    });

    const sections = BUCKET_ORDER
      .filter((b) => bucketMap.has(b))
      .map((b) => ({
        title: BUCKET_LABELS[b],
        items: groupBySpace(bucketMap.get(b)!).map(toItem),
      }));

    return {
      badge: null,
      label: 'Home',
      showFavorites: false,
      sections,
    };
  }, [recentLocations, loading, expanded]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
