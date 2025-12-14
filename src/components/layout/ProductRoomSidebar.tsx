import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { PRODUCT_ROOM_NAV_ICONS } from '@/components/icons/ProductRoomNavIcons';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const productSidebarConfig: SidebarConfig = {
  badge: 'PR',
  label: 'Product',
  items: [
    { id: 'Product Room', title: 'Product Room', path: '/product/room', exact: true },
    { id: 'Product Backlog', title: 'Product Backlog', path: '/industry/backlog', exact: false },
    { id: 'Product Kanban', title: 'Product Kanban', path: '/industry/kanban', exact: true },
    { id: 'Product Roadmap', title: 'Product Roadmap', path: '/industry/roadmaps', exact: false },
    { id: 'Product Capacity', title: 'Product Capacity', path: '/product/capacity', exact: true },
  ],
};

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const { isAdmin } = useUserRole();

  // Add settings footer for admins
  const configWithSettings: SidebarConfig = {
    ...productSidebarConfig,
    footerItem: isAdmin ? {
      id: 'product-settings',
      title: 'Product Settings',
      path: '#',
      icon: Lock,
      exact: true,
    } : undefined,
  };

  // Override navigation for settings (shows toast instead)
  const handleSettingsClick = () => {
    toast.info('Product Settings coming soon', { icon: <Lock className="h-4 w-4" /> });
  };

  return (
    <SidebarBase
      config={configWithSettings}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      iconResolver={(itemId) => PRODUCT_ROOM_NAV_ICONS[itemId]}
    />
  );
}
