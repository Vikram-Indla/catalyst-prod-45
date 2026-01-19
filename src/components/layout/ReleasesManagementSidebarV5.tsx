/**
 * ReleasesManagementSidebarV5 — Dark Slate Sidebar for Releases Module
 * 
 * Uses CatalystSidebar (V5 Spec) with dark theme
 */

import React from 'react';
import { 
  LayoutDashboard,
  Gauge,
  UserCheck,
  Package,
  Calendar,
  GitCompare,
  ClipboardList,
  FileCheck,
  Globe,
  Play,
  Bug,
  Sparkles,
  PieChart,
  ShieldCheck,
  Network,
} from 'lucide-react';
import { CatalystSidebar, SidebarContext, SidebarSection } from './CatalystSidebar';

interface ReleasesManagementSidebarV5Props {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

// Context configuration for Releases module
const releasesContext: SidebarContext = {
  id: 'releases',
  label: 'Releases',
  abbreviation: 'RL',
  color: '#2563eb', // blue-600
};

// Section configuration for Releases module
const releasesSections: SidebarSection[] = [
  {
    id: 'dashboards',
    label: 'Dashboards',
    items: [
      { 
        id: 'command-center', 
        label: 'Command Center', 
        href: '/releases/command-center', 
        icon: LayoutDashboard,
        exact: true,
      },
      { 
        id: 'release-dashboard', 
        label: 'Release Dashboard', 
        href: '/releases/dashboard', 
        icon: Gauge,
      },
      { 
        id: 'my-test-scope', 
        label: 'My Test Scope', 
        href: '/releases/my-scope', 
        icon: UserCheck,
        badge: { count: 5, variant: 'primary' },
      },
    ],
  },
  {
    id: 'releases',
    label: 'Releases',
    items: [
      { 
        id: 'all-releases', 
        label: 'All Releases', 
        href: '/releases/all', 
        icon: Package,
      },
      { 
        id: 'calendar-view', 
        label: 'Calendar View', 
        href: '/releases/calendar', 
        icon: Calendar,
      },
      { 
        id: 'release-compare', 
        label: 'Release Compare', 
        href: '/releases/compare', 
        icon: GitCompare,
      },
    ],
  },
  {
    id: 'test-planning',
    label: 'Test Planning',
    items: [
      { 
        id: 'test-plans', 
        label: 'Test Plans', 
        href: '/releases/test-plans', 
        icon: ClipboardList,
      },
      { 
        id: 'test-cases', 
        label: 'Test Cases', 
        href: '/releases/test-cases', 
        icon: FileCheck,
      },
      { 
        id: 'test-cycles', 
        label: 'Test Cycles', 
        href: '/releases/test-cycles', 
        icon: Globe,
      },
      { 
        id: 'test-execution', 
        label: 'Test Execution', 
        href: '/releases/execution', 
        icon: Play,
      },
      { 
        id: 'defects', 
        label: 'Defects', 
        href: '/releases/defects', 
        icon: Bug,
        badge: { count: 8, variant: 'danger' },
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & AI',
    items: [
      { 
        id: 'ask-ai', 
        label: 'Ask AI', 
        href: '/releases/ask-ai', 
        icon: Sparkles,
      },
      { 
        id: 'coverage-reports', 
        label: 'Coverage Reports', 
        href: '/releases/coverage', 
        icon: PieChart,
      },
      { 
        id: 'quality-gates', 
        label: 'Quality Gates', 
        href: '/releases/quality-gates', 
        icon: ShieldCheck,
      },
      { 
        id: 'rtm', 
        label: 'RTM', 
        href: '/releases/rtm', 
        icon: Network,
      },
    ],
  },
];

export function ReleasesManagementSidebarV5({
  collapsed,
  onCollapsedChange,
  className,
}: ReleasesManagementSidebarV5Props) {
  return (
    <CatalystSidebar
      context={releasesContext}
      sections={releasesSections}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      className={className}
    />
  );
}

export default ReleasesManagementSidebarV5;
