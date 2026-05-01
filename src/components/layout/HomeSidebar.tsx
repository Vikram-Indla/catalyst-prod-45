/**
 * HomeSidebar — personal command center on the / route.
 *
 *   ┌─ Home (badge "H")  ──────────────────┐
 *   │  Recent projects                     │
 *   │  ▣ Senaei BAU                        │
 *   │  ▣ ICP Project                       │
 *   │  ▣ Data Analytics Platform           │
 *   │  → All projects                      │
 *   └──────────────────────────────────────┘
 *
 * Project-grain only (Jira "Recent projects" parity, image 2)
 * ───────────────────────────────────────────────────────────
 *   The rail surfaces the user's most recently visited ProjectHub
 *   projects — name + branded ProjectIcon (icon + color from
 *   ph_projects). No ticket numbers, no pinned tickets, no Jump-to. The
 *   visit log is localStorage-backed (`useRecordProjectVisit` in
 *   CatalystShell, `useRecentProjects` here).
 *
 *   Removed sections:
 *   - "Jump to" (Apr 2026): duplicated the global 9-dot HubSwitcher.
 *   - "Pinned items" (May 2026): mixed ticket-grain into a project-grain
 *     rail. Star functionality remains available everywhere else
 *     (WorkItemStarButton, StarredPage, per-row stars in backlogs).
 */
import React, { useMemo } from 'react';
import { Clock, FolderOpen, ArrowRight } from 'lucide-react';
import { SidebarBase, type SidebarConfig, type SidebarMenuItem } from './SidebarBase';
import { useRecentProjects, type RecentProject } from '@/hooks/home/useRecentProjects';
import { ProjectIcon } from '@/components/shared/ProjectIcon';

const RECENT_PROJECTS_LIMIT = 6;

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
 * ProjectIcon adapter — renders the canonical branded ProjectIcon inside
 * SidebarBase's icon slot. Cached by composite key so React reconciles by
 * stable reference across config rebuilds.
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
  const { recentProjects, loading: recentLoading } = useRecentProjects(RECENT_PROJECTS_LIMIT);

  const config: SidebarConfig = useMemo(() => {
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

    return {
      badge: 'H',
      label: 'Home',
      showFavorites: false,
      sections: [
        { title: 'Recent projects', items: [...recentProjectItems, allProjectsItem] },
      ],
    };
  }, [recentProjects, recentLoading]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
