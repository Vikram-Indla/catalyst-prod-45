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
import { token } from '@atlaskit/tokens';
import ClockIcon from '@atlaskit/icon/core/clock';
import FolderOpenIcon from '@atlaskit/icon/core/folder-open';
import GridIcon from '@atlaskit/icon/core/grid';
import BranchIcon from '@atlaskit/icon/core/branch';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import SpreadsheetIcon from '@atlaskit/icon/core/spreadsheet';
import GoalIcon from '@atlaskit/icon/core/goal';
import BoardIcon from '@atlaskit/icon/core/board';
import LocationIcon from '@atlaskit/icon/core/location';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import SettingsIcon from '@atlaskit/icon/core/settings';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import { useRecentProjects, type RecentLocation } from '@/hooks/home/useRecentProjects';

const RECENT_LIMIT = 8;

interface HomeSidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

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
// Maps sectionLabel → Lucide icon component. This replaces the repeated
// project avatar so each recent row communicates WHERE you're going (view type)
// rather than WHICH project — the project key text already covers that.
// Matching is case-insensitive substring so "All work", "all-work" etc. all hit.
type LucideIcon = React.FC<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;

// Icons MUST match ProjectHubSidebar.tsx exactly — same section, same icon.
// dashboard→DashboardIcon, boards→GridIcon, backlog→BoardIcon, allwork→BranchIcon
const SECTION_ICON_MAP: Array<[RegExp, LucideIcon]> = [
  [/all.?work/i,  BranchIcon],      // allwork → BranchIcon
  [/backlog/i,    BoardIcon],       // backlog → BoardIcon
  [/\bboard/i,    GridIcon],        // boards → GridIcon (\b prevents matching "dashboard")
  [/dashboard/i,  DashboardIcon],
  [/report/i,     ChartBarIcon],
  [/setting/i,    SettingsIcon],
  [/calendar/i,   CalendarIcon],
  [/roadmap/i,    LocationIcon],
  [/list/i,       SpreadsheetIcon],
  [/issue/i,      GoalIcon],
];

function iconForSection(label: string): LucideIcon {
  for (const [pattern, Icon] of SECTION_ICON_MAP) {
    if (pattern.test(label)) return Icon;
  }
  return FolderOpenIcon;
}

// Stable component cache keyed by section label so React reconciles correctly.
const SECTION_ICON_COMPONENTS = new Map<string, React.FC<{ className?: string; style?: React.CSSProperties }>>();

function getSectionIconComponent(label: string) {
  let cached = SECTION_ICON_COMPONENTS.get(label);
  if (!cached) {
    const Icon = iconForSection(label);
    const Component: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ds-icon-subtle, var(--cp-text-secondary, #6B778C))', ...style }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
    );
    Component.displayName = `SectionIcon(${label})`;
    SECTION_ICON_COMPONENTS.set(label, Component);
    cached = Component;
  }
  return cached;
}

export default function HomeSidebar({
  expanded = true,
  onToggle = () => {},
  className,
}: HomeSidebarProps) {
  const { recentLocations, loading } = useRecentProjects(RECENT_LIMIT);

  const config: SidebarConfig = useMemo(() => {
    const items: SidebarMenuItem[] = loading
      ? [
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
        ]
      : recentLocations.length === 0
      ? [
          {
            id: 'recent-placeholder',
            title: (
              <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontSize: '12px' }}>
                No recent pages
              </span>
            ),
            path: '#',
            icon: ClockIcon,
            onClick: (e) => e.preventDefault(),
          },
        ]
      : recentLocations.map((loc) => ({
          // Path is the dedupe key in storage, so it's unique here too.
          id: `recent-${loc.path}`,
          title: <LocationRowTitle location={loc} />,
          path: loc.path,
          icon: getSectionIconComponent(loc.sectionLabel),
          // Project identity bar: data-driven from ph_projects.color.
          // Each row carries its project's brand color as a persistent 3px
          // left spine — instant visual differentiation between projects.
          // Falls back gracefully to undefined (no bar) when color is null.
          accentColor: loc.color ?? undefined,
        }));

    return {
      badge: null,
      label: 'Home',
      showFavorites: false,
      sections: [{ title: 'Recent', items }],
    };
  }, [recentLocations, loading]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
