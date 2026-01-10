/**
 * ReleasesManagementSidebar — Release & Test Management module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * 
 * Information Architecture:
 * - Dashboards: Command Center, Release Dashboard, My Test Scope
 * - Releases: All Releases, Calendar View, Release Compare
 * - Testing: Test Cases, Test Cycles, Test Execution
 * - Analytics & AI: Ask AI, Coverage Reports, Quality Gates, RTM
 * - Footer: Defects
 */

import { 
  LayoutDashboard,
  Gauge,
  UserCheck,
  Package,
  Calendar,
  GitCompare,
  FileCheck,
  Globe,
  Play,
  Sparkles,
  PieChart,
  ShieldCheck,
  Network,
  Bug,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from './SidebarBase';

interface ReleasesManagementSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const releasesManagementSidebarConfig: SidebarConfig = {
  badge: 'RL',
  label: 'Releases',
  items: [
    // Dashboards
    { id: 'command-center', title: 'Command Center', path: '/releases/command-center', icon: LayoutDashboard, exact: true },
    { id: 'release-dashboard', title: 'Release Dashboard', path: '/releases/dashboard', icon: Gauge, exact: false },
    { id: 'my-test-scope', title: 'My Test Scope', path: '/releases/my-scope', icon: UserCheck, exact: false, badge: 5, badgeVariant: 'info' },
    // Releases
    { id: 'all-releases', title: 'All Releases', path: '/releases/all', icon: Package, exact: false },
    { id: 'calendar', title: 'Calendar View', path: '/releases/calendar', icon: Calendar, exact: false },
    { id: 'compare', title: 'Release Compare', path: '/releases/compare', icon: GitCompare, exact: false },
    // Testing
    { id: 'test-cases', title: 'Test Cases', path: '/releases/test-cases', icon: FileCheck, exact: false },
    { id: 'test-cycles', title: 'Test Cycles', path: '/releases/test-cycles', icon: Globe, exact: false },
    { id: 'test-execution', title: 'Test Execution', path: '/releases/execution', icon: Play, exact: false },
    // Analytics & AI
    { id: 'ask-ai', title: 'Ask AI', path: '/releases/ask-ai', icon: Sparkles, exact: false },
    { id: 'coverage', title: 'Coverage Reports', path: '/releases/coverage', icon: PieChart, exact: false },
    { id: 'quality-gates', title: 'Quality Gates', path: '/releases/quality-gates', icon: ShieldCheck, exact: false },
    { id: 'rtm', title: 'RTM', path: '/releases/rtm', icon: Network, exact: false },
  ],
  footerItem: {
    id: 'defects',
    title: 'Defects',
    path: '/releases/defects',
    icon: Bug,
    exact: false,
    badge: 8,
    badgeVariant: 'danger',
  },
};

export function ReleasesManagementSidebar({ expanded, onToggle, className }: ReleasesManagementSidebarProps) {
  return (
    <SidebarBase
      config={releasesManagementSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
