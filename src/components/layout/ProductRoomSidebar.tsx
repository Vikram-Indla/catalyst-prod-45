/**
 * ProductRoomSidebar — Product module sidebar using SidebarBase
 * 
 * Refactored to use the shared SidebarBase component for consistent
 * styling, density, text, font size, and contrast across all hubs.
 */

import { 
  ClipboardList,
  Columns3,
  GanttChart,
  LayoutGrid,
  Zap,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useUserRole } from '@/hooks/useUserRole';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const { isAdmin } = useUserRole();

  const productSidebarConfig: SidebarConfig = {
    badge: 'PH',
    label: 'Product Hub',
    sections: [
      {
        title: 'Product Hub',
        items: [
          { id: 'backlog', title: 'Product Backlog', path: '/producthub/backlog', icon: ClipboardList, exact: true },
          { id: 'kanban', title: 'Product Kanban', path: '/producthub/kanban', icon: Columns3, exact: true },
          { id: 'roadmap', title: 'Product Roadmap', path: '/producthub/roadmaps', icon: GanttChart, exact: false },
          { id: 'cards', title: 'Product Cards', path: '/producthub/cards', icon: LayoutGrid, exact: true },
        ],
      },
      {
        title: 'Intelligence',
        items: [
          { id: 'req-assist', title: 'Req Assist™', path: '/producthub/requirement-assist', icon: Zap, exact: false, textBadge: 'AI', textBadgeVariant: 'info' as const },
        ],
      },
    ],
    footerItem: isAdmin ? {
      id: 'settings',
      title: 'Settings',
      path: '/producthub/settings',
      icon: Settings,
      exact: true,
    } : undefined,
  };

  return (
    <SidebarBase
      config={productSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
