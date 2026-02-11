/**
 * ReleaseHubSidebar — Release Management module sidebar using SidebarBase
 * 
 * Owns release lifecycle, quality gates, and related workflows.
 * 
 * Information Architecture with Section Headers:
 * - DASHBOARDS: Command Center, Release Dashboard
 * - RELEASES: All Releases, Calendar View, Release Compare
 * - QUALITY: Quality Gates, Coverage Reports, RTM
 * - ANALYTICS & AI: Ask AI, Reports
 */

import { 
  LayoutDashboard,
  Gauge,
  Package,
  Calendar,
  GitCompare,
  Sparkles,
  PieChart,
  ShieldCheck,
  Network,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface ReleaseHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const releaseHubSections: SidebarSection[] = [
  {
    title: 'Dashboards',
    items: [
      { id: 'command-center', title: 'Command Center', path: '/releasehub/command-center', icon: LayoutDashboard, exact: true },
      { id: 'release-dashboard', title: 'Release Dashboard', path: '/releasehub/dashboard', icon: Gauge, exact: false },
    ],
  },
  {
    title: 'Releases',
    items: [
      { id: 'all-releases', title: 'All Releases', path: '/releasehub/all', icon: Package, exact: false },
      { id: 'calendar', title: 'Calendar View', path: '/releasehub/calendar', icon: Calendar, exact: false },
      { id: 'compare', title: 'Release Compare', path: '/releasehub/compare', icon: GitCompare, exact: false },
    ],
  },
  {
    title: 'Quality',
    items: [
      { id: 'quality-gates', title: 'Quality Gates', path: '/releasehub/quality-gates', icon: ShieldCheck, exact: false },
      { id: 'coverage', title: 'Coverage Reports', path: '/releasehub/coverage', icon: PieChart, exact: false },
      { id: 'rtm', title: 'RTM', path: '/releasehub/rtm', icon: Network, exact: false },
    ],
  },
  {
    title: 'Analytics & AI',
    items: [
      { id: 'ask-ai', title: 'Ask AI', path: '/releasehub/ask-ai', icon: Sparkles, exact: false },
    ],
  },
];

const releaseHubSidebarConfig: SidebarConfig = {
  badge: 'RH',
  label: 'ReleaseHub',
  sections: releaseHubSections,
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/releasehub/settings',
    icon: Settings,
    exact: true,
  },
};

export function ReleaseHubSidebar({ expanded, onToggle, className }: ReleaseHubSidebarProps) {
  return (
    <SidebarBase
      config={releaseHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
