/**
 * Widget Registry — Static list of 11 WidgetDefinitions
 * Single source of truth for all dashboard widgets
 */
import type { ComponentType } from 'react';

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
  defaultSpan: 1 | 2 | 3;
  /**
   * Minimum grid-span required for this widget to render legibly.
   *
   * Dashboard list-type widgets (top-10 tables with ≥4 columns: key, severity,
   * title, status, assignee) need at least 2/3 of the grid width or their
   * Title column crushes titles into 3–5 wrap lines. Invariant enforced by
   * `DashboardWidgetGrid` — any layout row placing a `minSpan:2` widget at
   * span=1 is auto-upgraded at render. Caught Apr 19, 2026 (QA Defects
   * wrapping regression — see TruncateCell docstring).
   *
   * Omit or set to 1 for widgets that render fine anywhere (KPIs, progress,
   * small charts). Default: 1.
   */
  minSpan?: 1 | 2 | 3;
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
import RecentActivityWidget from './widgets/RecentActivityWidget';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // DELIVERY GROUP
  {
    id: 'milestones',
    title: 'Demand Fulfilment',
    subtitle: 'MDT delivery rollup',
    group: 'delivery',
    defaultSpan: 2,
    minSpan: 2,
    defaultPosition: 0,
    component: DemandFulfilmentGadget,
  },
  {
    id: 'release-health',
    title: 'Release Health',
    subtitle: 'Active release progress',
    group: 'delivery',
    defaultSpan: 1,
    defaultPosition: 1,
    component: ReleaseHealthWidget,
  },
  {
    id: 'items-by-status',
    title: 'Items by Status',
    subtitle: 'Status distribution',
    group: 'delivery',
    defaultSpan: 1,
    defaultPosition: 2,
    component: ItemsByStatusWidget,
  },
  {
    id: 'overdue',
    title: 'Overdue',
    subtitle: 'Past due date',
    group: 'delivery',
    defaultSpan: 1,
    defaultPosition: 3,
    component: OverdueWidget,
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    subtitle: 'Blocked items',
    group: 'delivery',
    defaultSpan: 1,
    defaultPosition: 4,
    component: OnHoldWidget,
  },
  {
    id: 'scope-change',
    title: 'Scope Change',
    subtitle: 'Items added after release start',
    group: 'delivery',
    defaultSpan: 1,
    defaultPosition: 5,
    component: ScopeChangeWidget,
  },
  // QUALITY GROUP
  {
    id: 'prod-incidents',
    title: 'Production Incidents',
    subtitle: 'Cross-hub from IncidentHub',
    group: 'quality',
    defaultSpan: 2,
    minSpan: 2,
    defaultPosition: 6,
    component: ProductionIncidentsWidget,
  },
  {
    id: 'qa-defects',
    title: 'QA Defects',
    subtitle: 'Cross-hub from TestHub',
    group: 'quality',
    defaultSpan: 2,
    minSpan: 2,
    defaultPosition: 7,
    component: QADefectsWidget,
  },
  // TEAM GROUP
  {
    id: 'team-workload',
    title: 'Team Workload',
    subtitle: 'Open items per assignee',
    group: 'team',
    defaultSpan: 2,
    defaultPosition: 8,
    component: TeamWorkloadWidget,
  },
  {
    id: 'time-in-status',
    title: 'Time in Status',
    subtitle: 'Per-ticket lifecycle',
    group: 'team',
    defaultSpan: 2,
    defaultPosition: 9,
    component: TimeInStatusWidget,
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    subtitle: 'Latest changes',
    group: 'team',
    defaultSpan: 2,
    minSpan: 2,
    defaultPosition: 10,
    component: RecentActivityWidget,
  },
];

export const WIDGET_GROUPS = [
  { key: 'delivery' as const, label: 'Delivery' },
  { key: 'quality' as const, label: 'Quality' },
  { key: 'team' as const, label: 'Team' },
];
