/**
 * WorkHubSidebar — ProjectHub sidebar using SidebarBase pattern
 * 
 * Matches Enterprise sidebar style: PH badge, collapse toggle, consistent nav items.
 * Special handling for Caty AI item (toggles panel instead of navigating).
 */

import {
  LayoutDashboard,
  LayoutList,
  Columns3,
  GanttChart,
  CalendarDays,
  Inbox,
  BarChart3,
  FileStack,
  Rocket,
  Palette,
  Users,
  PieChart,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from '@/components/layout/SidebarBase';

interface WorkHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}


const projectHubSidebarConfig: SidebarConfig = {
  badge: 'PH',
  label: 'Project Hub',
  items: [
    { id: 'dashboard', title: 'Dashboard', path: '/projecthub', icon: LayoutDashboard, exact: true },
    { id: 'all-work', title: 'All Work', path: '/workhub/all-work', icon: LayoutList, exact: false },
    { id: 'workitems', title: 'Work Items', path: '/projecthub/workitems', icon: FileStack, exact: false },
    { id: 'board', title: 'Board', path: '/projecthub/board', icon: Columns3, exact: false },
    { id: 'timeline', title: 'Timeline', path: '/projecthub/timeline', icon: GanttChart, exact: false },
    { id: 'calendar', title: 'Calendar', path: '/projecthub/calendar', icon: CalendarDays, exact: false },
    { id: 'backlog', title: 'Backlog', path: '/projecthub/backlog', icon: Inbox, exact: false },
    { id: 'releases', title: 'Releases', path: '/projecthub/releases', icon: Rocket, exact: false },
    { id: 'themes', title: 'Themes', path: '/projecthub/themes', icon: Palette, exact: false },
    { id: 'resource360', title: 'Resource 360', path: '/projecthub/resource360', icon: Users, exact: false },
    { id: 'capacity', title: 'Capacity', path: '/projecthub/capacity', icon: BarChart3, exact: false },
    { id: 'reports', title: 'Reports', path: '/projecthub/reports', icon: PieChart, exact: false },
  ],
};

export function WorkHubSidebar({ expanded, onToggle, className }: WorkHubSidebarProps) {
  return (
    <SidebarBase
      config={projectHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
