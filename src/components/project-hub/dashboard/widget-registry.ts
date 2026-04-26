/**
 * Widget Registry — Static list of 10 WidgetDefinitions
 * Single source of truth for all dashboard widgets.
 *
 * Apr 26, 2026 — Recent Activity removed. Three sources (ph_issues,
 * catalyst_status_history, tm_defects) lacked the changelog author at the
 * row level, so every entry collapsed to "System". The Jira changelog
 * backfill that would have fixed this isn't worth the operational
 * complexity for a feed users rarely scroll past the first 3 rows of.
 *
 * Apr 25, 2026 — 12-column grid migration.
 *   `defaultSpan` and `minSpan` are expressed in a 12-column base (was 3).
 *   This unblocks 4-up symmetry for KPI cards (`span=3` × 4 = 12) AND
 *   keeps 2-up / 3-up flexibility for tables (`span=6`, `span=4`).
 *   Translation matrix:
 *     defaultSpan 1 (of 3)  →  3 or 4 (of 12) — depending on widget kind
 *     defaultSpan 2 (of 3)  →  6 or 8 (of 12)
 *     defaultSpan 3 (of 3)  → 12 (of 12)
 *   minSpan follows the same translation, clamped by widget legibility.
 */
import type { ComponentType } from 'react';

export type WidgetSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WidgetProps {
  projectId: string;
  projectKey: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  subtitle?: string;
  group: 'delivery' | 'quality' | 'team';
  /**
   * Default grid-span out of 12 columns. Used as the initial value when
   * a widget is first added to a dashboard or when the user has no
   * persisted span override in `dashboard_widget_config.span`.
   */
  defaultSpan: WidgetSpan;
  /**
   * Minimum grid-span (out of 12) required for this widget to render
   * legibly. List-table widgets clamp at 6 or higher; KPI / chart
   * widgets clamp at 3.
   */
  minSpan?: WidgetSpan;
  defaultPosition: number;
  component: ComponentType<WidgetProps>;
}

// Lazy imports for widget components
import DemandFulfilmentGadget from './widgets/DemandFulfilmentGadget';
import ReleaseHealthWidget from './widgets/ReleaseHealthWidget';
import ItemsByStatusWidget from './widgets/ItemsByStatusWidget';
import OverdueWidget from './widgets/OverdueWidget';
import OnHoldWidget from './widgets/OnHoldWidget';
import ScopeChangeWidget from './widgets/ScopeChangeWidget';
import ProductionIncidentsWidget from './widgets/ProductionIncidentsWidget';
import QADefectsWidget from './widgets/QADefectsWidget';
import TeamWorkloadWidget from './widgets/TeamWorkloadWidget';
import TimeInStatusWidget from './widgets/TimeInStatusWidget';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // DELIVERY GROUP
  {
    id: 'milestones',
    title: 'Demand Fulfilment',
    subtitle: 'MDT delivery rollup',
    group: 'delivery',
    defaultSpan: 8,
    minSpan: 8,
    defaultPosition: 0,
    component: DemandFulfilmentGadget,
  },
  {
    id: 'release-health',
    title: 'Release Health',
    subtitle: 'Active release progress',
    group: 'delivery',
    defaultSpan: 4,
    minSpan: 3,
    defaultPosition: 1,
    component: ReleaseHealthWidget,
  },
  // 2-up layout (Apr 26, 2026) — Items by Status, Overdue, On Hold, and
  // Scope Change all carry list-style content (donut + breakdown rows;
  // ticket lists; release-progress bars). At span=3 the right column was
  // collapsing list items to ellipsis and the Scope Change release names
  // wrapped awkwardly. span=6 = 2 per row gives each card breathing room
  // for full ticket titles and a visible "view all" footer. minSpan kept
  // at 3 so users can still resize narrower in edit mode.
  {
    id: 'items-by-status',
    title: 'Items by Status',
    subtitle: 'Status distribution',
    group: 'delivery',
    defaultSpan: 6,
    minSpan: 3,
    defaultPosition: 2,
    component: ItemsByStatusWidget,
  },
  {
    id: 'overdue',
    title: 'Overdue',
    subtitle: 'Past due date',
    group: 'delivery',
    defaultSpan: 6,
    minSpan: 3,
    defaultPosition: 3,
    component: OverdueWidget,
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    subtitle: 'Blocked items',
    group: 'delivery',
    defaultSpan: 6,
    minSpan: 3,
    defaultPosition: 4,
    component: OnHoldWidget,
  },
  {
    id: 'scope-change',
    title: 'Scope Change',
    subtitle: 'Items added after release start',
    group: 'delivery',
    defaultSpan: 6,
    minSpan: 3,
    defaultPosition: 5,
    component: ScopeChangeWidget,
  },
  // QUALITY GROUP
  // Stacked full-width (Apr 26, 2026) — at span=6 the long Jira-style
  // titles + status lozenges + assignee + age columns were colliding once
  // the project side panel was open. Full-width gives both tables room
  // to breathe without horizontal scroll, and reads cleanly as a vertical
  // pair: Incidents → Defects.
  {
    id: 'prod-incidents',
    title: 'Production Incidents',
    subtitle: 'Cross-hub from IncidentHub',
    group: 'quality',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 6,
    component: ProductionIncidentsWidget,
  },
  {
    id: 'qa-defects',
    title: 'QA Defects',
    subtitle: 'Cross-hub from TestHub',
    group: 'quality',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 7,
    component: QADefectsWidget,
  },
  // TEAM GROUP
  {
    id: 'team-workload',
    title: 'Team Workload',
    subtitle: 'Open items · 2026 fiscal',
    group: 'team',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 8,
    component: TeamWorkloadWidget,
  },
  {
    id: 'time-in-status',
    title: 'Time in Status',
    subtitle: 'Per-ticket lifecycle',
    group: 'team',
    defaultSpan: 12,
    minSpan: 4,
    defaultPosition: 9,
    component: TimeInStatusWidget,
  },
];

export const WIDGET_GROUPS = [
  { key: 'delivery' as const, label: 'Delivery' },
  { key: 'quality' as const, label: 'Quality' },
  { key: 'team' as const, label: 'Team' },
];

/**
 * Span ladder for Edit-mode resize cycle. Pressing Wider steps right,
 * Narrower steps left. Each widget clamps to its own `minSpan`.
 */
export const SPAN_LADDER: WidgetSpan[] = [3, 4, 6, 8, 12];

export function nextSpan(current: number, direction: 'wider' | 'narrower', minSpan: WidgetSpan = 3): WidgetSpan {
  const valid = SPAN_LADDER.filter((s) => s >= minSpan);
  const idx = valid.findIndex((s) => s >= current);
  const safeIdx = idx === -1 ? valid.length - 1 : idx;
  if (direction === 'wider') {
    return valid[Math.min(safeIdx + 1, valid.length - 1)];
  }
  return valid[Math.max(safeIdx - 1, 0)];
}
