/**
 * IdeationSidebar — Ideation hub sidebar.
 *
 * Phase 6 (2026-05-02) — Ideation lifted out of Product Hub into its own
 * peer hub at /ideation/*. This sidebar renders the canonical Ideation
 * nav (Backlog / Board / Matrix / Themes / Analytics / Triage / Intelligence)
 * for any URL under /ideation. Uses SidebarBase for visual parity with
 * other hub sidebars.
 *
 * Why peer (not under Product Hub):
 *   Ideas are organization-wide intake. Product affinity is decided at the
 *   conversion wizard (Idea → Request[]), never at submission. Putting
 *   Ideation under Product Hub previously implied per-product ownership,
 *   which doesn't match the data model — see ph_ideas + idea_requests.
 *
 * ADS note (2026-05-02): SidebarBase is a mixed-icon component (Atlaskit
 * + lucide). Following codebase convention here. Pure-ADS migration of
 * the sidebar primitives is tracked separately.
 */

import {
  Lightbulb,
  Columns,
  ScatterChart,
  Rocket,
  BarChart3,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface IdeationSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const IDEATION_CONFIG: SidebarConfig = {
  badge: 'IH',
  label: 'Ideation Hub',
  sections: [
    {
      title: '',
      items: [
        { id: 'idea-backlog',  title: 'Ideas Backlog',     path: '/ideation/backlog',     icon: Lightbulb,    exact: true },
        { id: 'idea-board',    title: 'Ideas Board',       path: '/ideation/board',       icon: Columns,      exact: true },
        { id: 'idea-matrix',   title: 'Impact Matrix',     path: '/ideation/matrix',      icon: ScatterChart, exact: true },
        { id: 'idea-roadmap',  title: 'Ideas Roadmap',     path: '/ideation/roadmap',     icon: Rocket,       exact: true },
        { id: 'idea-themes',   title: 'Ideas Themes',      path: '/ideation/themes',      icon: Rocket,       exact: true },
        { id: 'idea-analytics', title: 'Ideas Analytics',  path: '/ideation/analytics',   icon: BarChart3,    exact: true },
      ],
    },
    {
      title: 'Workflow',
      items: [
        { id: 'idea-triage',       title: 'Triage Queue',          path: '/ideation/triage',       icon: Inbox,    exact: true },
        { id: 'idea-intelligence', title: 'Intelligence Hub',      path: '/ideation/intelligence', icon: Sparkles, exact: true, textBadge: 'AI' },
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
