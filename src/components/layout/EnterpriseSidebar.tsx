/**
 * EnterpriseSidebar — Strategy Hub sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling.
 * 3 sections: Strategy Hub, Intelligence, and footer Settings.
 */

import { 
  LayoutDashboard,
  Layers,
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
      // Design critique (2026-04-19): dropped "Strategy Hub" section label —
      // tautological with the badge/hub name already shown above. "Strategic
      // Themes" → "Themes" for the same reason; the hub context makes the
      // "Strategic" prefix redundant.
      title: '',
      items: [
        { id: 'strategy-room', title: 'Strategy Room', path: '/strategyhub', icon: LayoutDashboard, exact: true, activeMatchPaths: ['/strategyhub/executive-brief'] },
        { id: 'themes', title: 'Themes', path: '/strategyhub/themes', icon: Layers, exact: false },
        { id: 'goals', title: 'Goals & Key Results', path: '/strategyhub/goals', icon: Target, exact: false, badge: 12, badgeVariant: 'info' },
        { id: 'investment', title: 'Investment Allocation', path: '/strategyhub/investment', icon: PieChart, exact: false },
        { id: 'snapshots', title: 'Snapshots', path: '/strategyhub/snapshots', icon: Calendar, exact: false },
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
