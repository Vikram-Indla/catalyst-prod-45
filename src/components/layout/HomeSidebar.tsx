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
import { Clock, FolderOpen } from 'lucide-react';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import { useRecentProjects, type RecentLocation } from '@/hooks/home/useRecentProjects';
import { ProjectIcon } from '@/components/shared/ProjectIcon';

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
        gap: 6,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          color: 'var(--ds-text, #172B4D)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '0 1 auto',
          minWidth: 0,
        }}
        title={`${location.projectName} › ${location.sectionLabel}`}
      >
        {location.projectName}
      </span>
      <span
        style={{
          color: 'var(--ds-text-subtlest, #94A3B8)',
          fontWeight: 400,
          flex: '0 0 auto',
        }}
        aria-hidden="true"
      >
        ›
      </span>
      <span
        style={{
          color: 'var(--ds-text-subtle, #626F86)',
          fontWeight: 400,
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

/**
 * Branded ProjectIcon adapter — renders the canonical icon inside
 * SidebarBase's icon slot. Cached per (projectKey, iconName, color) so
 * React reconciles by stable reference across config rebuilds.
 */
const PROJECT_ICON_COMPONENTS = new Map<
  string,
  React.FC<{ className?: string; style?: React.CSSProperties }>
>();
function getProjectIconComponent(loc: RecentLocation) {
  const cacheKey = `${loc.projectKey}|${loc.iconName ?? ''}|${loc.color ?? ''}`;
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
          iconName={loc.iconName}
          color={loc.color}
          name={loc.projectName}
          size="small"
          variant="ghost"
        />
      </span>
    );
    Component.displayName = `ProjectIcon(${loc.projectKey})`;
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
                Your recent pages will appear here.
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
          icon: getProjectIconComponent(loc),
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
