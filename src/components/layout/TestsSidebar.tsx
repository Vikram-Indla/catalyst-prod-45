/**
 * TestsSidebar — Tests module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 */

import { 
  LayoutDashboard, 
  ListChecks, 
  Package, 
  RefreshCcw, 
  Play, 
  BarChart3, 
  Settings,
  GitBranch,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TestsSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const testsSidebarConfig: SidebarConfig = {
  badge: 'QA',
  label: 'Tests',
  items: [
    { id: 'overview', title: 'Overview', path: '/tests', icon: LayoutDashboard, exact: true },
    { id: 'cases', title: 'Cases', path: '/tests/cases', icon: ListChecks, exact: false },
    { id: 'sets', title: 'Sets', path: '/tests/sets', icon: Package, exact: false },
    { id: 'cycles', title: 'Cycles', path: '/tests/cycles', icon: RefreshCcw, exact: false },
    { id: 'executions', title: 'Executions', path: '/tests/executions', icon: Play, exact: false },
    { id: 'traceability', title: 'Traceability', path: '/tests/traceability', icon: GitBranch, exact: false },
    { id: 'reports', title: 'Reports', path: '/tests/reports', icon: BarChart3, exact: false },
  ],
  footerItem: {
    id: 'admin',
    title: 'Test Admin',
    path: '/tests/admin',
    icon: Settings,
    exact: true,
  },
};

export function TestsSidebar({ expanded, onToggle, className }: TestsSidebarProps) {
  return (
    <SidebarBase
      config={testsSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
