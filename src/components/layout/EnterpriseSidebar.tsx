/**
 * EnterpriseSidebar — Strategy Hub sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling.
 * 3 sections: Strategy Hub, Intelligence, and footer Settings.
 */

import { 
  LayoutDashboard,
  TrendingUp,
  Target,
  PieChart,
  Calendar,
  ShieldAlert,
  Sparkles,
  Users,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface EnterpriseSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const enterpriseSidebarConfig: SidebarConfig = {
  badge: 'ST',
  label: 'Strategy Hub',
  sections: [
    {
      title: 'Strategy Hub',
      items: [
        { id: 'strategy-room', title: 'Strategy Room', path: '/strategyhub', icon: LayoutDashboard, exact: true },
        { id: 'themes', title: 'Strategic Themes', path: '/strategyhub/themes', icon: TrendingUp, exact: false },
        { id: 'goals', title: 'Goals & Key Results', path: '/strategyhub/goals', icon: Target, exact: false, badge: 12, badgeVariant: 'info' },
        { id: 'investment', title: 'Investment Allocation', path: '/strategyhub/investment', icon: PieChart, exact: false },
        { id: 'snapshots', title: 'Snapshots', path: '/strategyhub/snapshots', icon: Calendar, exact: false },
        { id: 'risks', title: 'Risks', path: '/strategyhub/risks', icon: ShieldAlert, exact: false },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'ai-insights', title: 'AI Insights', path: '/strategyhub/ai-insights', icon: Sparkles, exact: false, badge: 3, badgeVariant: 'purple' },
        { id: 'team-alignment', title: 'Team Alignment', path: '/strategyhub/team-alignment', icon: Users, exact: false },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/strategyhub/settings',
    icon: Settings,
    exact: true,
  },
};

export function EnterpriseSidebar({ expanded, onToggle, className }: EnterpriseSidebarProps) {
  return (
    <SidebarBase
      config={enterpriseSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
