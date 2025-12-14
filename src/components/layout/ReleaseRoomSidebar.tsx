import { LayoutDashboard, AlertCircle, Tag, Calendar, Settings, BarChart3 } from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface ReleaseRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const releaseSidebarConfig: SidebarConfig = {
  badge: 'RL',
  label: 'Release',
  items: [
    { id: 'release-room', title: 'Release Room', path: '/release/overview', icon: LayoutDashboard, exact: true },
    { id: 'incidents', title: 'Incidents', path: '/release/incidents', icon: AlertCircle, exact: false },
    { id: 'dashboard', title: 'Dashboard', path: '/release/incidents/dashboard', icon: BarChart3, exact: true },
    { id: 'versions', title: 'Versions', path: '/release/versions', icon: Tag, exact: false },
    { id: 'calendar', title: 'Calendar', path: '/release/calendar', icon: Calendar, exact: true },
  ],
  footerItem: {
    id: 'release-settings',
    title: 'Release Settings',
    path: '/release/settings',
    icon: Settings,
    exact: true,
  },
};

export function ReleaseRoomSidebar({ expanded, onToggle, className }: ReleaseRoomSidebarProps) {
  return (
    <SidebarBase
      config={releaseSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
