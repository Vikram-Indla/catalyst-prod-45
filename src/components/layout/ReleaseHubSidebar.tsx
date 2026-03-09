/**
 * ReleaseHubSidebar v2.1 — Release & Change Management sidebar
 * 
 * Sections: DASHBOARDS, RELEASES, CHANGE MANAGEMENT, PRODUCTION
 */

import { 
  LayoutDashboard,
  Package,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Zap,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface ReleaseHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  triageCount?: number;
}

const buildSections = (triageCount: number): SidebarSection[] => [
  {
    title: 'Dashboards',
    items: [
      { id: 'command-center', title: 'Command Center', path: '/releasehub/command-center', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Releases',
    items: [
      { id: 'all-releases', title: 'All Releases', path: '/releasehub/all-releases', icon: Package, exact: false },
      { id: 'compare', title: 'Release Compare', path: '/releasehub/compare', icon: BarChart3, exact: false },
      { id: 'triage', title: 'Triage Queue', path: '/releasehub/triage', icon: AlertCircle, exact: false, badge: triageCount > 0 ? triageCount : undefined, badgeVariant: 'danger' as const },
    ],
  },
  {
    title: 'Change Management',
    items: [
      { id: 'all-changes', title: 'All Changes', path: '/releasehub/changes', icon: RefreshCw, exact: false },
    ],
  },
  {
    title: 'Production',
    items: [
      { id: 'production-events', title: 'Production Events', path: '/releasehub/production-events', icon: Zap, exact: false },
    ],
  },
];

export function ReleaseHubSidebar({ expanded, onToggle, className, triageCount = 0 }: ReleaseHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'RH',
    label: 'ReleaseHub',
    sections: buildSections(triageCount),
    footerItem: {
      id: 'settings',
      title: 'Settings',
      path: '/releasehub/settings',
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
