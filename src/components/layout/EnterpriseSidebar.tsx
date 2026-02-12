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
  Wallet,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface EnterpriseSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const enterpriseSidebarConfig: SidebarConfig = {
  badge: 'ST',
  label: 'Strategy Hub',
  items: [
    { id: 'strategy-room', title: 'Strategy Room', path: '/strategyhub/strategy-room', icon: Focus, exact: true },
    { id: 'strategic-backlog', title: 'Strategic Backlog', path: '/strategyhub/backlog', icon: ListTree, exact: false },
    { id: 'objective-tree', title: 'Objective Tree', path: '/strategyhub/okr-hub', icon: Workflow, exact: false },
    { id: 'roadmaps', title: 'Enterprise Roadmap', path: '/strategyhub/roadmaps', icon: Map, exact: false },
    { id: 'risks', title: 'Risks', path: '/strategyhub/risks', icon: Blocks, exact: false },
    { id: 'capacity', title: 'Capacity Planner', path: '/strategyhub/capacity', icon: UsersIcon, exact: false },
    { id: 'budget-planner', title: 'Budget Planner', path: '/strategyhub/budget-planner', icon: Wallet, exact: false },
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
