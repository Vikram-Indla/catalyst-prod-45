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
import type { WidgetSpan, WidgetProps, WidgetDefinition } from './widget-types';

// Re-export for backward compatibility
export type { WidgetSpan, WidgetProps, WidgetDefinition };

// Lazy imports for widget components
import DemandFulfilmentGadget from './widgets/DemandFulfilmentGadget';
import ActiveSprintsWidget from './widgets/ActiveSprintsWidget';
import ItemsByStatusWidget from './widgets/ItemsByStatusWidget';
import OverdueWidget from './widgets/OverdueWidget';
import OnHoldWidget from './widgets/OnHoldWidget';
import ScopeChangeWidget from './widgets/ScopeChangeWidget';
import ProductionIncidentsWidget from './widgets/ProductionIncidentsWidget';
import QADefectsWidget from './widgets/QADefectsWidget';
import TeamWorkloadWidget from './widgets/TeamWorkloadWidget';
import TimeInStatusWidget from './widgets/TimeInStatusWidget';
import BrPulseMapWidget from './widgets/BrPulseMapWidget';
import HealthRadarWidget from './widgets/HealthRadarWidget';
import ReleaseConfidenceWidget from './widgets/ReleaseConfidenceWidget';
import StakeholderLensWidget from './widgets/StakeholderLensWidget';
import DeliveryCompositionWidget from './widgets/DeliveryCompositionWidget';
import TestCasesOverviewWidget from './widgets/TestCasesOverviewWidget';
import TestCyclesProgressWidget from './widgets/TestCyclesProgressWidget';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ─── §1 STRATEGIC DELIVERY ──────────────────────────────────────────
  // Are we hitting commitments?
  {
    id: 'milestones',
    title: 'Epic Progress',
    subtitle: 'Linked epic completion by initiative',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 0,
    component: DemandFulfilmentGadget,
    /* Epics are a Jira-hierarchy concept; business_requests has no epic
       linking. Hidden on product per PO + Vikram judgment (2026-06-15).
       Incidents have no epic linking either — hidden on incident too. */
    hideOnProduct: true,
    hideOnIncident: true,
  },
  {
    id: 'sprint-timelines',
    title: 'Sprint Timelines',
    subtitle: 'Active sprints grouped by release — Gantt view',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 1,
    component: ActiveSprintsWidget,
    hideOnIncident: true,
    hideOnProduct: true,
    hideOnProject: true,
  },

  // ─── §2 VOLUME & SHAPE ──────────────────────────────────────────────
  // What's the body of work?
  {
    id: 'items-by-status',
    title: 'Items by Status',
    subtitle: 'Where is work concentrated?',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 2,
    component: ItemsByStatusWidget,
    hideOnProject: true,
    hideOnProduct: true,
  },
  {
    id: 'scope-change',
    title: 'Scope Change',
    subtitle: 'Did we plan correctly, or did the release inflate?',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 3,
    component: ScopeChangeWidget,
    /* No BR equivalent — business_requests has no scope_change tracking.
       Hidden on product-hub dashboards per PO directive (2026-06-15).
       Incidents have no scope concept — hidden on incident too. */
    hideOnProduct: true,
    hideOnIncident: true,
    hideOnProject: true,
  },

  // ─── §3 EXCEPTIONS ──────────────────────────────────────────────────
  // What needs intervention right now?
  {
    id: 'overdue',
    title: 'Overdue',
    subtitle: 'Past due date — sorted by most slipped first',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 4,
    component: OverdueWidget,
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    subtitle: 'Blocked items grouped by reason',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
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
    minSpan: 12,
    defaultPosition: 6,
    component: ProductionIncidentsWidget,
    /* No BR equivalent. Hidden on product per PO (2026-06-15).
       On incident hub the entire dashboard IS incidents — this peer-widget
       is redundant, so hidden there too. */
    hideOnProduct: true,
    hideOnIncident: true,
  },
  {
    id: 'qa-defects',
    title: 'QA Defects',
    subtitle: 'Cross-hub from TestHub',
    group: 'quality',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 7,
    component: QADefectsWidget,
    /* No BR equivalent. Hidden on product per PO (2026-06-15).
       Not relevant on incident hub (incidents !== QA defects). */
    hideOnProduct: true,
    hideOnIncident: true,
  },

  // ─── §5 CAPACITY & FLOW ─────────────────────────────────────────────
  // How is the team performing?
  {
    id: 'team-workload',
    title: 'Team Workload',
    subtitle: 'Who is overloaded? · 2026 fiscal',
    group: 'team',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 8,
    component: TeamWorkloadWidget,
    hideOnProject: true,
    hideOnProduct: true,
  },
  {
    id: 'time-in-status',
    title: 'Time in Status',
    subtitle: 'Where do tickets get stuck?',
    group: 'team',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 9,
    component: TimeInStatusWidget,
    /* business_requests has no status_changed_at column — no time-in-status
       computation possible. Hidden on product per PO (2026-06-15).
       Incident hub: ph_issues has no status_changed_at column either, so
       same constraint — hidden here too. */
    hideOnProduct: true,
    hideOnIncident: true,
    hideOnProject: true,
  },

  // ─── §6 DATE PULSE HEALTH (product-only) ────────────────────────────
  // Health visibility for Business Requests via DatePulseEngine.
  {
    id: 'br-pulse-map',
    title: 'BR Pulse Map',
    subtitle: 'Health distribution across Business Requests',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 10,
    component: BrPulseMapWidget,
    hideOnProject: true,
    hideOnIncident: true,
  },
  {
    id: 'health-radar',
    title: 'Release Health',
    subtitle: 'At-risk business requests sorted by severity',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 11,
    component: HealthRadarWidget,
    hideOnProject: true,
    hideOnIncident: true,
  },
  {
    id: 'release-confidence',
    title: 'Release Confidence',
    subtitle: 'Delivery confidence score for this product',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 12,
    component: ReleaseConfidenceWidget,
    hideOnProject: true,
    hideOnIncident: true,
  },
  {
    id: 'stakeholder-lens',
    title: 'Stakeholder Lens',
    subtitle: 'Health distribution by owner',
    group: 'team',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 13,
    component: StakeholderLensWidget,
    hideOnProject: true,
    hideOnIncident: true,
  },
  {
    id: 'delivery-composition',
    title: 'Delivery Composition',
    subtitle: 'Business requests by process step and health',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 0,
    component: DeliveryCompositionWidget,
    hideOnProject: true,
    hideOnIncident: true,
  },

  // ─── §6 TEST HUB ────────────────────────────────────────────────────
  // 2026-06-21: TestHub-only widgets reading tm_test_cases / tm_test_cycles.
  {
    id: 'test-cases-overview',
    title: 'Test cases',
    subtitle: 'Repository overview',
    group: 'quality',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 0,
    component: TestCasesOverviewWidget,
    hideOnProject: true,
    hideOnProduct: true,
    hideOnIncident: true,
  },
  {
    id: 'test-cycles-progress',
    title: 'Active test cycles',
    subtitle: 'Execution progress',
    group: 'quality',
    defaultSpan: 12,
    minSpan: 6,
    defaultPosition: 1,
    component: TestCyclesProgressWidget,
    hideOnProject: true,
    hideOnProduct: true,
    hideOnIncident: true,
  },
];

/**
 * 2026-06-15: mode-aware registry lookup. Consumers should call this
 * instead of WIDGET_REGISTRY directly so the four product-incompatible
 * widgets (scope-change, prod-incidents, qa-defects, time-in-status) are
 * automatically dropped from product-hub dashboards.
 * 2026-06-17: same idea for incident hub — drops widgets that don't apply
 * to a Production-Incident-filtered ph_issues view.
 */
export type DashboardRegistryMode = 'project' | 'product' | 'incident' | 'test';

export function getWidgetRegistry(mode: DashboardRegistryMode = 'project'): WidgetDefinition[] {
  if (mode === 'product') {
    return WIDGET_REGISTRY.filter((w) => !w.hideOnProduct);
  }
  if (mode === 'incident') {
    return WIDGET_REGISTRY.filter((w) => !w.hideOnIncident);
  }
  if (mode === 'test') {
    /* 2026-06-21: TestHub renders ONLY widgets explicitly tagged for test
       mode (id starts with 'test-'). Every other widget is gated out — the
       ph_issues-backed widgets all have hide flags that incidentally
       overlapped, so the previous "AND of hide flags" approach leaked
       ActiveSprintsWidget through. */
    return WIDGET_REGISTRY.filter((w) => w.id.startsWith('test-') && !w.hideOnTest);
  }
  // project (and tasks) mode: drop product-only Date Pulse widgets
  return WIDGET_REGISTRY.filter((w) => !w.hideOnProject);
}

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
