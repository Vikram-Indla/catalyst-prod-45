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
  Layers,
  Play,
  Target,
  GitBranch,
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
    // Test Assets
    { id: 'cases', title: 'Test Cases', path: '/tests/cases', icon: FileText, exact: false },
    { id: 'sets', title: 'Test Sets', path: '/tests/sets', icon: Layers, exact: false },
    // Execution
    { id: 'cycles', title: 'Test Cycles', path: '/tests/cycles', icon: RefreshCw, exact: false },
    { id: 'execution', title: 'Test Execution', path: '/tests/execution', icon: Play, exact: false },
    // Quality
    { id: 'defects', title: 'Defects', path: '/tests/defects', icon: Bug, exact: false },
    { id: 'requirements', title: 'Requirements', path: '/tests/requirements', icon: Target, exact: false },
    { id: 'traceability', title: 'Traceability', path: '/tests/traceability', icon: GitBranch, exact: false },
    // Analytics
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
