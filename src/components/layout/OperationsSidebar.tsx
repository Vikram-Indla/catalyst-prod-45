import { List, Users, FileText, Settings, Wand2, History, ClipboardCheck, Settings2, LayoutTemplate } from 'lucide-react';
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
    badge: 'OP',
    label: 'Operations',
    items: [
      // Requirement Assist section
      { 
        id: 'requirement-assist', 
        title: 'Requirement Assist™', 
        path: '/operations/requirement-assist', 
        icon: Wand2, 
        exact: false,
      },
      { 
        id: 'generation-history', 
        title: 'Generation History', 
        path: '/operations/requirement-assist/history', 
        icon: History, 
        exact: true 
      },
      { 
        id: 'ra-templates', 
        title: 'Templates', 
        path: '/admin/requirement-assist/templates', 
        icon: LayoutTemplate, 
        exact: false 
      },
      { 
        id: 'ra-compliance', 
        title: 'Compliance', 
        path: '/admin/requirement-assist/compliance', 
        icon: ClipboardCheck, 
        exact: false 
      },
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
    footerItem: {
      id: 'ra-admin-settings',
      title: 'RA Admin Settings',
      path: '/admin/requirement-assist',
      icon: Settings2,
      exact: false,
    },
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
