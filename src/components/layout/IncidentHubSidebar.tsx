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

// Design critique (2026-04-19): 6 items across 2 sections was over-grouped.
//   - Dropped "Incidents" section — tautological with hub name ("IH /
//     IncidentHub" already shown above).
//   - Dropped "Reports" section — only 2 items, and "Committee Queue" isn't
//     a report (it's a governance queue), so the label was misleading.
//   - "Incident List" → "All Incidents" (section name no longer duplicates).
//   - "Incident Reports" → "Reports" (hub context carries the prefix).
// Flat list is the right shape at this item count; reintroduce sections
// only when the list passes ~7-8 items or splits into genuinely distinct
// verb clusters.
const sections: SidebarSection[] = [
  {
    title: '',
    items: [
      { id: 'incident-list', title: 'All Incidents', path: '/incident-hub', icon: List, exact: true, badgeVariant: 'danger' },
      { id: 'analytics', title: 'Analytics', path: '/incident-hub/analytics', icon: BarChart3, exact: false },
      { id: 'insights', title: 'Insights', path: '/incident-hub/insights', icon: Sparkles, exact: false },
      { id: 'kanban', title: 'Kanban', path: '/incident-hub/kanban', icon: LayoutGrid, exact: false },
      { id: 'reports', title: 'Reports', path: '/incident-hub/reports', icon: FileText, exact: false },
      { id: 'committee-queue', title: 'Committee Queue', path: '/incident-hub/committee-queue', icon: Users, exact: false },
    ],
  },
];

export function IncidentHubSidebar({ expanded, onToggle, className }: IncidentHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'IH',
    // Block A rule 7 (2026-05-01): canonical spaced casing.
    label: 'Incident Hub',
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
