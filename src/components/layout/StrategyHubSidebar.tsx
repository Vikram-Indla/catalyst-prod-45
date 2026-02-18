/**
 * StrategyHubSidebar — Strategy Hub module sidebar using SidebarBase
 */

import {
  LayoutDashboard,
  Palette,
  Target,
  Rocket,
  PieChart,
  Camera,
  Brain,
  Users,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface StrategyHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const strategyHubSidebarConfig: SidebarConfig = {
  badge: 'ST',
  label: 'Strategy Hub',
  sections: [
    {
      title: 'Strategy',
      items: [
        { id: 'strategy-room', title: 'Strategy Room', path: '/strategy/room', icon: LayoutDashboard, exact: true },
        { id: 'strategic-themes', title: 'Strategic Themes', path: '/strategy/themes', icon: Palette, exact: false },
        { id: 'goals-key-results', title: 'Goals & Key Results', path: '/strategy/goals', icon: Target, exact: false },
        { id: 'initiatives', title: 'Initiatives', path: '/strategy/initiatives', icon: Rocket, exact: false },
        { id: 'investment', title: 'Investment Allocation', path: '/strategy/investment', icon: PieChart, exact: false },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'snapshots', title: 'Snapshots', path: '/strategy/snapshots', icon: Camera, exact: false },
        { id: 'ai-insights', title: 'AI Insights', path: '/strategy/ai-insights', icon: Brain, exact: false },
        { id: 'team-alignment', title: 'Team Alignment', path: '/strategy/team-alignment', icon: Users, exact: false },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/strategy/settings',
    icon: Settings,
    exact: true,
  },
  showFavorites: false,
};

export function StrategyHubSidebar({ expanded, onToggle, className }: StrategyHubSidebarProps) {
  return (
    <SidebarBase
      config={strategyHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
