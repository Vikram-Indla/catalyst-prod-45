import { AlertCircle, Tag, Calendar, Settings, List, Users, FileText } from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from './SidebarBase';
import { useOpenIncidentCount } from '@/hooks/useOpenIncidentCount';

interface ReleaseRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ReleaseRoomSidebar({ expanded, onToggle, className }: ReleaseRoomSidebarProps) {
  const { data: openIncidentCount = 0 } = useOpenIncidentCount();

  const releaseSidebarConfig: SidebarConfig = {
    badge: 'RL',
    label: 'Release',
    items: [
      { id: 'incidents', title: 'Incident List', path: '/release/incidents', icon: List, exact: true, badge: openIncidentCount },
      { id: 'incident-reports', title: 'Incident Reports', path: '/release/incident-reports', icon: FileText, exact: true },
      { id: 'committee-queue', title: 'Committee Queue', path: '/release/committee-queue', icon: Users, exact: true },
      { id: 'versions', title: 'Releases', path: '/release/versions', icon: Tag, exact: false },
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

  return (
    <SidebarBase
      config={releaseSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
