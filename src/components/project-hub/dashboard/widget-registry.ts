/**
 * Widget Registry — Static list of 10 WidgetDefinitions
 * Single source of truth for all dashboard widgets.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  EXECUTIVE SCAN ORDER (Apr 26, 2026)
 * ═══════════════════════════════════════════════════════════════════════
 * Every widget is full-width (span = 12). One gadget per row gives the
 * eye breathing space and makes the dashboard read as a top-to-bottom
 * narrative — the way an exec naturally consumes a status report.
 *
 * The 10 widgets group into 5 mental-model sections, scanned in this
 * order:
 *
 *   §1  STRATEGIC DELIVERY    — Are we hitting commitments?
 *        1. Demand Fulfilment — MDT delivery rollup (the headline)
 *        2. Release Health    — Active releases on track or at risk
 *
 *   §2  VOLUME & SHAPE        — What's the body of work?
 *        3. Items by Status   — Where is work concentrated?
 *        4. Scope Change      — Did we plan correctly, or did the
 *                               release inflate after start?
 *
 *   §3  EXCEPTIONS            — What needs intervention right now?
 *        5. Overdue           — What's slipping past due date?
 *        6. On Hold           — What's blocked, and why?
 *
 *   §4  QUALITY               — What's the output quality?
 *        7. Production Incidents — What's broken in prod?
 *        8. QA Defects        — What test failures are open?
 *
 *   §5  CAPACITY & FLOW       — How is the team performing?
 *        9. Team Workload     — Who is overloaded?
 *       10. Time in Status    — Where do tickets get stuck?
 *
 * Each section answers a different question; together they form the
 * full "are we delivering, what's blocked, and is the team healthy?"
 * picture an exec needs in one scroll.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  GRID NOTES
 * ═══════════════════════════════════════════════════════════════════════
 *   `defaultSpan` and `minSpan` are expressed in a 12-column base.
 *   Span 12 = full row. Users can still resize narrower in edit mode
 *   if they want a denser layout — minSpan keeps each widget legible.
 *
 *   Apr 26, 2026 — Recent Activity removed (sources lacked changelog
 *   author at the row level; every entry collapsed to "System").
 *
 *   Apr 26, 2026 — Full-width single-column layout. Earlier 2-up
 *   variants (span=6) were cramped on narrower viewports + the project
 *   side panel; full width gives every widget the executive scale it
 *   deserves.
 * ═══════════════════════════════════════════════════════════════════════
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
   * Default grid-span out of 12 columns. All widgets default to 12
   * (full-row) per the executive-scan order; users can resize narrower
   * in edit mode if they prefer density over breathing space.
   */
  defaultSpan: WidgetSpan;
  /**
   * Minimum grid-span (out of 12) required for this widget to render
   * legibly. List-table widgets clamp at 6 or higher; KPI / chart
   * widgets clamp at 3 or 4.
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
  // ─── §1 STRATEGIC DELIVERY ──────────────────────────────────────────
  // Are we hitting commitments?
  {
    id: 'milestones',
    title: 'Demand Fulfilment',
    subtitle: 'MDT delivery rollup',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 0,
    component: DemandFulfilmentGadget,
  },
  {
    id: 'release-health',
    title: 'Release Health',
    subtitle: 'Active releases on track or at risk',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 4,
    defaultPosition: 1,
    component: ReleaseHealthWidget,
  },

  // ─── §2 VOLUME & SHAPE ──────────────────────────────────────────────
  // What's the body of work?
  {
    id: 'items-by-status',
    title: 'Items by Status',
    subtitle: 'Where is work concentrated?',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 4,
    defaultPosition: 2,
    component: ItemsByStatusWidget,
  },
  {
    id: 'scope-change',
    title: 'Scope Change',
    subtitle: 'Did we plan correctly, or did the release inflate?',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 3,
    component: ScopeChangeWidget,
  },

  // ─── §3 EXCEPTIONS ──────────────────────────────────────────────────
  // What needs intervention right now?
  {
    id: 'overdue',
    title: 'Overdue',
    subtitle: 'Past due date — sorted by most slipped first',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 4,
    component: OverdueWidget,
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    subtitle: 'Blocked items grouped by reason',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 5,
    component: OnHoldWidget,
  },

  // ─── §4 QUALITY ─────────────────────────────────────────────────────
  // What's the output quality?
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

  // ─── §5 CAPACITY & FLOW ─────────────────────────────────────────────
  // How is the team performing?
  {
    id: 'team-workload',
    title: 'Team Workload',
    subtitle: 'Who is overloaded? · 2026 fiscal',
    group: 'team',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 8,
    component: TeamWorkloadWidget,
  },
  {
    id: 'time-in-status',
    title: 'Time in Status',
    subtitle: 'Where do tickets get stuck?',
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
