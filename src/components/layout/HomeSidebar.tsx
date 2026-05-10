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
import {
  Clock, FolderOpen, Columns3, GitBranch, LayoutDashboard,
  Table2, CircleDot, Layers, Map as MapIcon, BarChart2, Settings, Calendar,
} from '@/lib/atlaskit-icons';
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
        background: 'var(--ds-background-neutral, #F1F5F9)',
        opacity: 0.8,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Title renderer — "Project Name" in primary text, " › Section" in
 * subtle text. Uses ADS tokens so it themes correctly in dark mode.
 */
function LocationRowTitle({ location }: { location: RecentLocation }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      {/* Project key — primary label, 14px/500, color.text */}
      <span
        style={{
          color: 'var(--ds-text, #172B4D)',
          fontWeight: 600,
          fontSize: '13px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
        }}
        title={`${location.projectName} › ${location.sectionLabel}`}
      >
        {location.projectKey}
      </span>
      {/* Separator — 11px, color.text.subtlest — reads as breadcrumb crumb, not competing text */}
      <span
        style={{
          color: 'var(--ds-text-subtlest, #626F86)',
          fontWeight: 400,
          fontSize: '11px',
          flex: '0 0 auto',
          lineHeight: '20px',
        }}
        aria-hidden="true"
      >
        ›
      </span>
      {/* Section label — 12px/400, color.text.subtlest (ADS meta size) */}
      <span
        style={{
          color: 'var(--ds-text-subtlest, #626F86)',
          fontWeight: 400,
          fontSize: '12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '0 1 auto',
          minWidth: 0,
        }}
      >
        {location.sectionLabel}
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
// dashboard→LayoutDashboard, boards→Columns3, backlog→Layers, allwork→GitBranch
const SECTION_ICON_MAP: Array<[RegExp, LucideIcon]> = [
  [/all.?work/i,  GitBranch],     // ProjectHubSidebar: allwork → GitBranch
  [/backlog/i,    Layers],        // ProjectHubSidebar: backlog → Layers
  [/\bboard/i,    Columns3],      // ProjectHubSidebar: boards → Columns3 (\b prevents matching "dashboard")
  [/dashboard/i,  LayoutDashboard],
  [/report/i,     BarChart2],
  [/setting/i,    Settings],
  [/calendar/i,   Calendar],
  [/roadmap/i,    MapIcon],
  [/list/i,       Table2],
  [/issue/i,      CircleDot],
];

function iconForSection(label: string): LucideIcon {
  for (const [pattern, Icon] of SECTION_ICON_MAP) {
    if (pattern.test(label)) return Icon;
  }
  return FolderOpen;
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
        style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ds-icon-subtle, #6B778C)', ...style }}
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
          { id: 'recent-skel-1', title: <SkeletonRowTitle />, path: '#recent-skel-1', icon: FolderOpen },
          { id: 'recent-skel-2', title: <SkeletonRowTitle />, path: '#recent-skel-2', icon: FolderOpen },
          { id: 'recent-skel-3', title: <SkeletonRowTitle />, path: '#recent-skel-3', icon: FolderOpen },
        ]
      : recentLocations.length === 0
      ? [
          {
            id: 'recent-empty',
            title: (
              <span style={{ color: 'var(--ds-text-subtlest, #94A3B8)', fontSize: 13 }}>
                No recent pages yet
              </span>
            ),
            path: '#recent-empty',
            icon: Clock,
            onClick: () => {},
          },
        ]
      : recentLocations.map((loc) => ({
          // Path is the dedupe key in storage, so it's unique here too.
          id: `recent-${loc.path}`,
          title: <LocationRowTitle location={loc} />,
          path: loc.path,
          icon: getSectionIconComponent(loc.sectionLabel),
        }));

    return {
      badge: 'H',
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
