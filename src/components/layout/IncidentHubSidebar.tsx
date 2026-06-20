/**
 * IncidentHubSidebar — Incident Management sidebar
 * 
 * 6 items: Incident List, Analytics, Insights, Kanban, (divider), Incident Reports, Committee Queue
 */

import {
  List,
  BarChart3,
  Sparkles,
  FileText,
  Users,
} from '@/lib/atlaskit-icons';
import {
  NavWorkIcon,
  NavFiltersIcon,
  NavTimelineIcon,
  NavDashboardIcon,
  NavKanbanIcon,
} from '@/lib/nav-icons';
import { HUB_ICON_REGISTRY } from '@/components/icons';
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
      /* 2026-06-17: Dashboard as first item to match project + product
         hubs (Dashboard → Backlog/Board → Work → …). */
      { id: 'dashboard', title: 'Dashboard', path: '/incident-hub/dashboard', icon: NavDashboardIcon, exact: false },
      { id: 'incident-list', title: 'All Incidents', path: '/incident-hub/all-incidents', icon: List, exact: false, badgeVariant: 'danger' },
      { id: 'analytics', title: 'Analytics', path: '/incident-hub/analytics', icon: BarChart3, exact: false },
      { id: 'insights', title: 'Insights', path: '/incident-hub/insights', icon: Sparkles, exact: false },
      /* 2026-06-16: "Kanban" → "Board" — matches the label used by
         project and product hubs. Path repointed to /incident-hub/board
         (canonical KanbanPage with mode='incident'); the legacy
         /incident-hub/kanban URL still redirects here. */
      { id: 'board', title: 'Board', path: '/incident-hub/board', icon: NavKanbanIcon, exact: false },
      /* Work tab — canonical AllWork view, mode='incident'.
         Same sequence as project / product hubs (after Board). */
      { id: 'work', title: 'Work', path: '/incident-hub/work', icon: NavWorkIcon, exact: false },
      /* 2026-06-16: Filters tab — canonical FiltersListPage hubType='incident'.
         Sequence (Board → Work → Filters) mirrors project + product hubs. */
      { id: 'filters', title: 'Filters', path: '/incident-hub/filters', icon: NavFiltersIcon, exact: false },
      /* 2026-06-17: Timeline tab — canonical TimelineView mounted with
         useIncidentHubTimeline data (ph_issues filtered to
         issue_type='Production Incident'). Same Gantt chrome as project
         + product hubs. */
      { id: 'timeline', title: 'Timeline', path: '/incident-hub/timeline', icon: NavTimelineIcon, exact: false },
      { id: 'reports', title: 'Reports', path: '/incident-hub/reports', icon: FileText, exact: false },
      { id: 'committee-queue', title: 'Committee Queue', path: '/incident-hub/committee-queue', icon: Users, exact: false },
    ],
  },
];

export function IncidentHubSidebar({ expanded, onToggle, className }: IncidentHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'IH',
    label: 'Incidents',
    badgeHubIconUrl: HUB_ICON_REGISTRY['incident'],
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
