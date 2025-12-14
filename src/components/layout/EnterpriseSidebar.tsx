/**
 * EnterpriseSidebar — Enterprise module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 */

import { 
  Focus, 
  CircleDot, 
  ListTree, 
  Workflow, 
  Map, 
  Blocks, 
  Users as UsersIcon, 
  TrendingUp,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface EnterpriseSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const enterpriseSidebarConfig: SidebarConfig = {
  badge: 'EN',
  label: 'Enterprise',
  items: [
    { id: 'strategy-room', title: 'Strategy Room', path: '/enterprise/strategy-room', icon: Focus, exact: true },
    { id: 'strategic-snapshots', title: 'Strategic Snapshots', path: '/enterprise/snapshots', icon: CircleDot, exact: false },
    { id: 'strategic-backlog', title: 'Strategic Backlog', path: '/enterprise/backlog', icon: ListTree, exact: false },
    { id: 'objective-tree', title: 'Objective Tree', path: '/enterprise/okr-hub', icon: Workflow, exact: false },
    { id: 'roadmaps', title: 'Roadmaps', path: '/enterprise/roadmaps', icon: Map, exact: false },
    { id: 'risks', title: 'Risks', path: '/enterprise/risks', icon: Blocks, exact: false },
    { id: 'capacity', title: 'Capacity', path: '/enterprise/reports/demand-capacity', icon: UsersIcon, exact: false },
    { id: 'reports', title: 'Reports', path: '/reports-discovery', icon: TrendingUp, exact: false },
  ],
  footerItem: {
    id: 'settings',
    title: 'Enterprise Settings',
    path: '/admin/settings',
    icon: Settings,
    exact: true,
  },
};

export function EnterpriseSidebar({ expanded, onToggle, className }: EnterpriseSidebarProps) {
  return (
    <SidebarBase
      config={enterpriseSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
