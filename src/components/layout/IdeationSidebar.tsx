/**
 * IdeationSidebar — Ideation hub sidebar.
 *
 * CAT-IDEATION-REBUILD-20260709-001 (S5): config replaced for the greenfield
 * module — Inbox / Explore / Portfolio + Admin (design 04 §C). The legacy
 * Backlog/Board/Matrix/Themes/Analytics/Triage/Intelligence nav went with the
 * legacy /ideation/* mounts (D1 routes-only decommission).
 *
 * Why peer (not under Product Hub):
 *   Ideas are organization-wide intake. Product affinity is decided at the
 *   conversion wizard (Idea → Business Request), never at submission.
 *
 * Icons come from @/lib/atlaskit-icons — the @atlaskit/icon/core-backed shim
 * (zero lucide per the Phase 1 Plan Lock).
 */

import { Inbox, Search, ScatterChart, Settings } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface IdeationSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const IDEATION_CONFIG: SidebarConfig = {
  badge: 'IH',
  label: 'Ideation',
  sections: [
    {
      title: '',
      items: [
        { id: 'idn-inbox',     title: 'Inbox',     path: Routes.ideation.inbox(),     icon: Inbox,        exact: true },
        { id: 'idn-explore',   title: 'Explore',   path: Routes.ideation.explore(),   icon: Search,       exact: true },
        { id: 'idn-portfolio', title: 'Portfolio', path: Routes.ideation.portfolio(), icon: ScatterChart, exact: true },
      ],
    },
    {
      title: 'Manage',
      items: [
        { id: 'idn-admin', title: 'Admin', path: Routes.ideation.admin.root(), icon: Settings, exact: false },
      ],
    },
  ],
  footerItem: undefined,
};

export function IdeationSidebar({ expanded, onToggle, className }: IdeationSidebarProps) {
  return (
    <SidebarBase
      config={IDEATION_CONFIG}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
