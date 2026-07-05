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

const strataSidebarConfig: SidebarConfig = {
  badge: 'ST',
  label: 'STRATA',
  sections: [
    {
      title: '',
      items: [
        { id: 'command-center', title: 'Command Center', path: '/strata', icon: LayoutDashboard, exact: true },
        { id: 'strategy-room', title: 'Strategy Room', path: '/strata/strategy', icon: Layers, exact: true, activeMatchPaths: ['/strata/strategy/map'] },
        { id: 'scorecards', title: 'Scorecards', path: '/strata/scorecards', icon: PieChart, exact: false },
        { id: 'kpis', title: 'KPI & OKR Library', path: '/strata/kpis', icon: Target, exact: false },
      ],
    },
    {
      title: 'Delivery & Value',
      items: [
        { id: 'execution', title: 'Execution', path: '/strata/execution', icon: Users, exact: false },
        { id: 'portfolio', title: 'Portfolio & Value', path: '/strata/portfolio', icon: Sparkles, exact: false },
      ],
    },
    {
      title: 'Governance',
      items: [
        { id: 'data', title: 'Data & Lineage', path: '/strata/data', icon: Database, exact: false },
        { id: 'reviews', title: 'Reviews & Decisions', path: '/strata/reviews', icon: Calendar, exact: false },
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
