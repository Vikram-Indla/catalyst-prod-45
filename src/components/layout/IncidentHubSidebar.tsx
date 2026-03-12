/**
 * IncidentHubSidebar — Incident Management sidebar
 * 
 * 6 items: Incident List, Analytics, Insights, Kanban, (divider), Incident Reports, Committee Queue
 */

import { 
  List,
  BarChart3,
  Sparkles,
  LayoutGrid,
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
      { id: 'incident-list', title: 'Incident List', path: '/incident-hub', icon: List, exact: true, badgeVariant: 'danger' },
      { id: 'analytics', title: 'Analytics', path: '/incident-hub/analytics', icon: BarChart3, exact: false },
      { id: 'insights', title: 'Insights', path: '/incident-hub/insights', icon: Sparkles, exact: false },
      { id: 'kanban', title: 'Kanban', path: '/incident-hub/kanban', icon: LayoutGrid, exact: false },
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
