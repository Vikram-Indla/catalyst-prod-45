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
  badge: 'TES',
  label: 'Tests',
  items: [
    { id: 'command-center', title: 'Command Center', path: '/releases/command-center', icon: LayoutDashboard, exact: true },
    { id: 'my-work', title: 'My Work', path: '/releases/my-scope', icon: Home, exact: true },
    // Test Assets
    { id: 'cases', title: 'Test Cases', path: '/releases/test-cases', icon: FileText, exact: false },
    { id: 'sets', title: 'Test Sets', path: '/releases/test-plans', icon: Layers, exact: false },
    // Execution
    { id: 'cycles', title: 'Test Cycles', path: '/releases/test-cycles', icon: RefreshCw, exact: false },
    { id: 'execution', title: 'Test Execution', path: '/releases/execution', icon: Play, exact: false },
    // Quality
    { id: 'defects', title: 'Defects', path: '/releases/defects', icon: Bug, exact: false },
    { id: 'requirements', title: 'Requirements', path: '/releases/rtm', icon: Target, exact: false },
    { id: 'traceability', title: 'Traceability', path: '/releases/coverage', icon: GitBranch, exact: false },
    // Analytics
    { id: 'reports', title: 'Reports', path: '/releases/quality-gates', icon: BarChart3, exact: false },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/releases/dashboard',
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
