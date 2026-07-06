/**
 * ReleaseHubSidebar — Release Operations sidebar
 *
 * Sections (handoff §6, 2026-06-18; Backlog/Kanban split 2026-06-18 parity):
 *   - Overview (unlabeled top)
 *   - Releases: Backlog, Release Kanban, Production Events, Calendar
 *   - Change Management: Change Records, SOP Templates, Sign-off Queue, Freeze Windows
 *   - Settings (footer)
 *
 * Removed this phase: Incidents, Triage Queue, Release Compare.
 */

import {
  List,
  Clock,
  Calendar,
  ArrowLeftRight,
  ListChecks,
  CheckSquare,
  CalendarOff,
  Settings,
} from '@/lib/atlaskit-icons';
import { HUB_ICON_REGISTRY } from '@/components/icons';
import { NavKanbanIcon, NavDashboardIcon, NavWorkIcon, NavTimelineIcon } from '@/lib/nav-icons';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface ReleaseHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  pendingSignoffs?: number;
}

export const buildReleaseHubSections = (pendingSignoffs: number): SidebarSection[] => [
  {
    title: '',
    items: [
      { id: 'overview', title: 'Dashboard', path: '/release-hub/overview', icon: NavDashboardIcon, exact: true },
    ],
  },
  {
    title: 'Releases',
    items: [
      { id: 'release-management', title: 'Releases', path: '/release-hub/releases-management', icon: List, exact: true },
      { id: 'release-kanban', title: 'Board', path: '/release-hub/release-kanban', icon: NavKanbanIcon, exact: false },
      { id: 'work', title: 'Work', path: '/release-hub/work', icon: NavWorkIcon, exact: false },
      { id: 'timeline', title: 'Timeline', path: '/release-hub/timeline', icon: NavTimelineIcon, exact: false },
      { id: 'calendar', title: 'Calendar', path: '/release-hub/calendar', icon: Calendar, exact: true },
      { id: 'execution', title: 'Execution', path: '/release-hub/execution', icon: Clock, exact: true },
    ],
  },
  {
    title: 'Change Management',
    items: [
      { id: 'all-changes', title: 'Change Records', path: '/release-hub/changes', icon: ArrowLeftRight, exact: false },
      { id: 'change-board', title: 'Change Board', path: '/release-hub/change-board', icon: NavKanbanIcon, exact: false },
      { id: 'sop-templates', title: 'SOP Templates', path: '/release-hub/sop-templates', icon: ListChecks, exact: false },
      { id: 'sign-off-queue', title: 'Sign-off Queue', path: '/release-hub/sign-off-queue', icon: CheckSquare, exact: false, badge: pendingSignoffs > 0 ? pendingSignoffs : undefined, badgeVariant: 'danger' as const },
      { id: 'freeze-windows', title: 'Freeze Windows', path: '/release-hub/freeze-windows', icon: CalendarOff, exact: true },
      { id: 'production-events', title: 'Production Events', path: '/release-hub/production-events', icon: Clock, exact: false },
    ],
  },
];

export function ReleaseHubSidebar({ expanded, onToggle, className, pendingSignoffs = 0 }: ReleaseHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'RO',
    label: 'Release Operations',
    badgeHubIconUrl: HUB_ICON_REGISTRY['release'],
    sections: buildReleaseHubSections(pendingSignoffs),
    footerItem: {
      id: 'settings',
      title: 'Settings',
      path: '/release-hub/settings',
      icon: Settings,
      exact: true,
    },
  };

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
