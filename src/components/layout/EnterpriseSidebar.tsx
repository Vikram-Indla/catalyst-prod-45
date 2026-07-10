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
  // Four canonical areas under the Strategy Cycle (locked STRATA hierarchy,
  // CAT-STRATA-FOUNDATION-20260709-001 REQ-004). Routes unchanged.
  sections: [
    {
      title: '',
      items: [
        { id: 'command-center', title: 'Command Center', path: '/strata', icon: LayoutDashboard, exact: true },
      ],
    },
    {
      title: 'Strategy Execution',
      items: [
        { id: 'strategy-room', title: 'Strategy Room', path: '/strata/strategy', icon: Layers, exact: true, activeMatchPaths: ['/strata/strategy/map'] },
        { id: 'execution', title: 'Project Cards', path: '/strata/execution', icon: Users, exact: false },
      ],
    },
    {
      title: 'Balanced Scorecard',
      items: [
        { id: 'scorecards', title: 'Scorecards', path: '/strata/scorecards', icon: PieChart, exact: false },
        { id: 'kpis', title: 'KPI & OKR Library', path: '/strata/kpis', icon: Target, exact: false },
      ],
    },
    {
      title: 'Value Management Office',
      items: [
        { id: 'portfolio', title: 'Portfolio & Value', path: '/strata/portfolio', icon: Sparkles, exact: false },
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
