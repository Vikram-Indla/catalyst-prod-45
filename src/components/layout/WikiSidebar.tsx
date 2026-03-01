/**
 * WikiSidebar — /wiki sidebar using SidebarBase
 * Follows the same pattern as ProjectHubSidebar, ProductRoomSidebar, etc.
 */

import {
  Home,
  Zap,
  Factory,
  Ship,
  FlaskConical,
  Leaf,
  Landmark,
  Bot,
  HardHat,
  Globe,
  Pickaxe,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const WIKI_SIDEBAR_CONFIG: SidebarConfig = {
  badge: 'WK',
  label: 'Wiki',
  sections: [
    {
      title: '',
      items: [
        { id: 'home', title: 'Home', path: '/wiki', icon: Home, exact: true },
        { id: 'whats-new', title: "What's New", path: '/wiki/whats-new', icon: Zap, exact: true },
      ],
    },
    {
      title: 'Domains',
      items: [
        { id: 'd1', title: 'Industrial Licensing', path: '/wiki/category/industrial-licensing', icon: Factory, exact: false },
        { id: 'd2', title: 'Customs & Trade', path: '/wiki/category/customs-trade', icon: Ship, exact: false },
        { id: 'd3', title: 'Chemical Permits', path: '/wiki/category/chemical-permits', icon: FlaskConical, exact: false },
        { id: 'd4', title: 'Environmental Compliance', path: '/wiki/category/environmental-compliance', icon: Leaf, exact: false },
        { id: 'd5', title: 'Industrial Incentives', path: '/wiki/category/industrial-incentives', icon: Landmark, exact: false },
        { id: 'd6', title: 'Fourth Industrial Revolution', path: '/wiki/category/fourth-industrial-revolution', icon: Bot, exact: false },
        { id: 'd7', title: 'Workforce & Industrial Support', path: '/wiki/category/workforce-support', icon: HardHat, exact: false },
        { id: 'd8', title: 'Senaei Platform', path: '/wiki/category/senaei-platform', icon: Globe, exact: false },
        { id: 'd9', title: 'Mining & Mineral Resources', path: '/wiki/category/mining-minerals', icon: Pickaxe, exact: false },
      ],
    },
  ],
};

export function WikiSidebar({ expanded, onToggle, className }: WikiSidebarProps) {
  return (
    <SidebarBase
      config={WIKI_SIDEBAR_CONFIG}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
