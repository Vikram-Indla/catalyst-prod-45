/**
 * ReleaseHubSidebar v2.1 — Release & Change Management sidebar
 * 
 * Sections: DASHBOARDS, RELEASES, CHANGE MANAGEMENT, PRODUCTION
 */

import { 
  LayoutDashboard,
  Rocket,
  GitCompareArrows,
  Activity,
  ArrowLeftRight,
  CheckSquare,
  Clock,
  CalendarOff,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface ReleaseHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  triageCount?: number;
  pendingSignoffs?: number;
}

const buildSections = (triageCount: number, pendingSignoffs: number): SidebarSection[] => [
  {
    title: 'Dashboards',
    items: [
      { id: 'command-center', title: 'Command Center', path: '/release-hub/command-center', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Releases',
    items: [
      { id: 'all-releases', title: 'All Releases', path: '/release-hub/releases', icon: Rocket, exact: false },
      { id: 'compare', title: 'Release Compare', path: '/release-hub/compare', icon: GitCompareArrows, exact: false },
      { id: 'triage', title: 'Triage Queue', path: '/release-hub/triage', icon: Activity, exact: false, badge: triageCount > 0 ? triageCount : undefined, badgeVariant: 'danger' as const },
    ],
  },
  {
    title: 'Change Management',
    items: [
      { id: 'all-changes', title: 'All Changes', path: '/release-hub/changes', icon: ArrowLeftRight, exact: false },
      { id: 'sign-off-queue', title: 'Sign-off Queue', path: '/release-hub/sign-off-queue', icon: CheckSquare, exact: false, badge: pendingSignoffs > 0 ? pendingSignoffs : undefined, badgeVariant: 'danger' as const },
    ],
  },
  {
    title: 'Production',
    items: [
      { id: 'production-events', title: 'Production Events', path: '/release-hub/production-events', icon: Clock, exact: false },
    ],
  },
  {
    title: 'Settings',
    items: [
      { id: 'freeze-windows', title: 'Freeze Windows', path: '/release-hub/freeze-windows', icon: CalendarOff, exact: true },
    ],
  },
];

export function ReleaseHubSidebar({ expanded, onToggle, className, triageCount = 0, pendingSignoffs = 0 }: ReleaseHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'RH',
    label: 'ReleaseHub',
    sections: buildSections(triageCount, pendingSignoffs),
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
