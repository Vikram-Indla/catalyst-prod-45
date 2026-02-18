/**
 * EnterpriseSidebar — Enterprise module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 */

import { 
  Blocks, 
  Settings,
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
    { id: 'risks', title: 'Strategy Risks', path: '/strategyhub/risks', icon: Blocks, exact: false },
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
