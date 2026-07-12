/**
 * EnterpriseSidebar — STRATA sidebar using SidebarBase
 * (CAT-STRATA-20260705-001: Strategy Hub decommissioned; this sidebar now
 * carries the STRATA IA. Uses the shared SidebarBase for consistent styling.)
 */

import {
  LayoutDashboard,
  Layers,
  Target,
  PieChart,
  Calendar,
  Sparkles,
  Users,
  Settings,
  Database,
} from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface EnterpriseSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export const strataSidebarConfig: SidebarConfig = {
  badge: 'ST',
  label: 'STRATA',
  // Task-sequence IA (STRATA design pack anchor 11, CAT-STRATA-IMPL-20260712-001):
  // Direction · Measurement · Delivery · Value · Governance. Labels/grouping only —
  // routes unchanged and no restyle (sidebar is visual-frozen). The My Work item is
  // added together with its route in slice 1B, so no nav link points at an unmounted route.
  sections: [
    {
      title: '',
      items: [
        { id: 'command-center', title: 'Command Center', path: '/strata', icon: LayoutDashboard, exact: true },
      ],
    },
    {
      title: 'Direction',
      items: [
        { id: 'strategy-room', title: 'Strategy Room', path: '/strata/strategy', icon: Layers, exact: true, activeMatchPaths: ['/strata/strategy/map'] },
      ],
    },
    {
      title: 'Measurement',
      items: [
        { id: 'scorecards', title: 'Scorecards', path: '/strata/scorecards', icon: PieChart, exact: false },
        { id: 'kpis', title: 'KPIs & OKRs', path: '/strata/kpis', icon: Target, exact: false },
      ],
    },
    {
      title: 'Delivery',
      items: [
        { id: 'execution', title: 'Project Cards', path: '/strata/execution', icon: Users, exact: false },
      ],
    },
    {
      title: 'Value',
      items: [
        { id: 'portfolio', title: 'Portfolio & Benefits', path: '/strata/portfolio', icon: Sparkles, exact: false },
      ],
    },
    {
      title: 'Governance',
      items: [
        { id: 'reviews', title: 'Reviews & Decisions', path: '/strata/reviews', icon: Calendar, exact: false },
        { id: 'data', title: 'Data & Lineage', path: '/strata/data', icon: Database, exact: false },
      ],
    },
  ],
  footerItem: {
    id: 'strata-admin',
    title: 'Configuration',
    path: '/strata/admin',
    icon: Settings,
    exact: false,
  },
};

export function EnterpriseSidebar({ expanded, onToggle, className }: EnterpriseSidebarProps) {
  return (
    <SidebarBase
      config={strataSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
