/**
 * WorkHubSidebar — ProjectHub sidebar using SidebarBase pattern
 * 
 * Matches Enterprise sidebar style: PH badge, collapse toggle, consistent nav items.
 * Special handling for Caty AI item (toggles panel instead of navigating).
 */

import {
  LayoutDashboard,
  FileStack,
  Rocket,
  Palette,
  Users,
  CalendarDays,
  BarChart3,
  PieChart,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from '@/components/layout/SidebarBase';

interface WorkHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  catyOpen?: boolean;
  onCatyToggle?: () => void;
}

const projectHubSidebarConfig: SidebarConfig = {
  badge: 'PH',
  label: 'ProjectHub',
  items: [
    { id: 'dashboard', title: 'Dashboard', path: '/projecthub', icon: LayoutDashboard, exact: true },
    { id: 'workitems', title: 'Work Items', path: '/projecthub/workitems', icon: FileStack, exact: false },
    { id: 'releases', title: 'Releases', path: '/projecthub/releases', icon: Rocket, exact: false },
    { id: 'themes', title: 'Themes', path: '/projecthub/themes', icon: Palette, exact: false },
    { id: 'resource360', title: 'Resource 360', path: '/projecthub/resource360', icon: Users, exact: false },
    { id: 'calendar', title: 'Calendar', path: '/projecthub/calendar', icon: CalendarDays, exact: false },
    { id: 'capacity', title: 'Capacity', path: '/projecthub/capacity', icon: BarChart3, exact: false },
    { id: 'analytics', title: 'Analytics', path: '/projecthub/analytics', icon: PieChart, exact: false },
    { id: 'caty-ai', title: 'Caty AI', path: '/projecthub/caty', icon: Sparkles, exact: false },
  ],
};

export function WorkHubSidebar({ expanded, onToggle, className, catyOpen, onCatyToggle }: WorkHubSidebarProps) {
  return (
    <SidebarBase
      config={projectHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
