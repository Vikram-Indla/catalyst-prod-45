/**
 * WikiSidebar — /wiki sidebar using SidebarBase
 * Follows the same pattern as ProjectHubSidebar, ProductRoomSidebar, etc.
 */

import {
  Home,
  Zap,
  BookOpen,
  Target,
  Package,
  Wrench,
  CheckSquare,
  Landmark,
  Globe,
  BarChart3,
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
        { id: 'd1', title: 'Platform Overview', path: '/wiki/category/platform', icon: BookOpen, exact: false },
        { id: 'd2', title: 'Strategy & Governance', path: '/wiki/category/strategy', icon: Target, exact: false },
        { id: 'd3', title: 'Product Management', path: '/wiki/category/products', icon: Package, exact: false },
        { id: 'd4', title: 'Project Execution', path: '/wiki/category/projects', icon: Wrench, exact: false },
        { id: 'd5', title: 'Quality & Testing', path: '/wiki/category/quality', icon: CheckSquare, exact: false },
        { id: 'd6', title: 'Ministry Services', path: '/wiki/category/ministry', icon: Landmark, exact: false },
        { id: 'd7', title: 'Senaei Platform', path: '/wiki/category/senaei', icon: Globe, exact: false },
        { id: 'd8', title: 'Analytics & Reporting', path: '/wiki/category/analytics', icon: BarChart3, exact: false },
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
