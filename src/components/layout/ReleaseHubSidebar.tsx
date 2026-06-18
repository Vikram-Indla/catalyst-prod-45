/**
 * ReleaseHubSidebar — Release Operations sidebar
 *
 * Sections (handoff §6, 2026-06-18):
 *   - Overview (unlabeled top)
 *   - Releases: Releases, Production Events, Calendar
 *   - Change Management: Change Records, SOP Templates, Sign-off Queue, Freeze Windows
 *   - Settings (footer)
 *
 * Removed this phase: Incidents, Triage Queue, Release Compare.
 */

import {
  LayoutDashboard,
  Rocket,
  Clock,
  Calendar,
  ArrowLeftRight,
  ListChecks,
  CheckSquare,
  CalendarOff,
  Settings,
} from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface ReleaseHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  pendingSignoffs?: number;
}

const buildSections = (pendingSignoffs: number): SidebarSection[] => [
  {
    title: '',
    items: [
      { id: 'overview', title: 'Overview', path: '/release-hub/overview', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Releases',
    items: [
      { id: 'all-releases', title: 'Releases', path: '/release-hub/releases', icon: Rocket, exact: false },
      { id: 'production-events', title: 'Production Events', path: '/release-hub/production-events', icon: Clock, exact: false },
      { id: 'calendar', title: 'Calendar', path: '/release-hub/calendar', icon: Calendar, exact: true },
    ],
  },
  {
    title: 'Change Management',
    items: [
      { id: 'all-changes', title: 'Change Records', path: '/release-hub/changes', icon: ArrowLeftRight, exact: false },
      { id: 'sop-templates', title: 'SOP Templates', path: '/release-hub/sop-templates', icon: ListChecks, exact: false },
      { id: 'sign-off-queue', title: 'Sign-off Queue', path: '/release-hub/sign-off-queue', icon: CheckSquare, exact: false, badge: pendingSignoffs > 0 ? pendingSignoffs : undefined, badgeVariant: 'danger' as const },
      { id: 'freeze-windows', title: 'Freeze Windows', path: '/release-hub/freeze-windows', icon: CalendarOff, exact: true },
    ],
  },
];

export function ReleaseHubSidebar({ expanded, onToggle, className, pendingSignoffs = 0 }: ReleaseHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'RO',
    label: 'Release Operations',
    sections: buildSections(pendingSignoffs),
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
