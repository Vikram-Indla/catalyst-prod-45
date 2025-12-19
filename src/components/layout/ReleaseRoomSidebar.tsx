import { LayoutDashboard, AlertCircle, Tag, Calendar, Settings, List, Users, FileText } from 'lucide-react';
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
    { id: 'incidents-dashboard', title: 'Incident Dashboard', path: '/release/incidents/dashboard', icon: LayoutDashboard, exact: true },
    { id: 'incidents', title: 'Incident List', path: '/release/incidents', icon: List, exact: true },
    { id: 'incident-reports', title: 'Incident Reports', path: '/release/incident-reports', icon: FileText, exact: true },
    { id: 'committee-queue', title: 'CAP Committee Queue', path: '/release/committee-queue', icon: Users, exact: true },
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
