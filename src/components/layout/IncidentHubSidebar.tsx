/**
 * IncidentHubSidebar — Incident Management sidebar
 * 
 * Sections: INCIDENTS, ANALYTICS, REPORTS
 */

import { 
  List,
  Columns3,
  BarChart3,
  Lightbulb,
  FileText,
  Users,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface IncidentHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const sections: SidebarSection[] = [
  {
    title: 'Incidents',
    items: [
      { id: 'incident-list', title: 'Incident List', path: '/incident-hub', icon: List, exact: true },
      { id: 'kanban-board', title: 'Kanban Board', path: '/incident-hub/kanban', icon: Columns3, exact: false },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'analytics', title: 'Analytics', path: '/incident-hub/analytics', icon: BarChart3, exact: false },
      { id: 'insights', title: 'Insights', path: '/incident-hub/insights', icon: Lightbulb, exact: false },
    ],
  },
  {
    title: 'Reports',
    items: [
      { id: 'reports', title: 'Incident Reports', path: '/incident-hub/reports', icon: FileText, exact: false },
      { id: 'committee-queue', title: 'Committee Queue', path: '/incident-hub/committee-queue', icon: Users, exact: false },
    ],
  },
];

export function IncidentHubSidebar({ expanded, onToggle, className }: IncidentHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'IH',
    label: 'IncidentHub',
    sections,
  };

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
