/**
 * TestManagementSidebar — Test Management module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 */

import { 
  Home,
  FileText,
  RefreshCw,
  Bug,
  BarChart3,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TestManagementSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const testManagementSidebarConfig: SidebarConfig = {
  badge: 'TM',
  label: 'Test Management',
  items: [
    { id: 'command-center', title: 'Command Center', path: '/tests/command-center', icon: LayoutDashboard, exact: true },
    { id: 'my-work', title: 'My Work', path: '/tests/my-work', icon: Home, exact: true },
    { id: 'cases', title: 'Test Cases', path: '/tests/cases', icon: FileText, exact: false },
    { id: 'cycles', title: 'Test Cycles', path: '/tests/cycles', icon: RefreshCw, exact: false },
    { id: 'defects', title: 'Defects', path: '/tests/defects', icon: Bug, exact: false },
    { id: 'reports', title: 'Reports', path: '/tests/reports', icon: BarChart3, exact: false },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/tests/settings',
    icon: Settings,
    exact: true,
  },
};

export function TestManagementSidebar({ expanded, onToggle, className }: TestManagementSidebarProps) {
  return (
    <SidebarBase
      config={testManagementSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
