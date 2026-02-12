import { List, Users, FileText } from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useOpenIncidentCount } from '@/hooks/useOpenIncidentCount';

interface OperationsSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ReleaseRoomSidebar({ expanded, onToggle, className }: OperationsSidebarProps) {
  const { data: openIncidentCount = 0 } = useOpenIncidentCount();

  const operationsSidebarConfig: SidebarConfig = {
    badge: 'IH',
    label: 'Incident Hub',
    items: [
      // Incidents section
      { 
        id: 'incidents', 
        title: 'Incident List', 
        path: '/release/incidents', 
        icon: List, 
        exact: true, 
        badge: openIncidentCount 
      },
      { 
        id: 'incident-reports', 
        title: 'Incident Reports', 
        path: '/release/incident-reports', 
        icon: FileText, 
        exact: true 
      },
      { 
        id: 'committee-queue', 
        title: 'Committee Queue', 
        path: '/release/committee-queue', 
        icon: Users, 
        exact: true 
      },
    ],
  };

  return (
    <SidebarBase
      config={operationsSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
