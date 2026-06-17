/**
 * Widget type definitions - extracted to break circular dependencies
 * between widget-registry.ts and individual widget components
 */
import type { ComponentType } from 'react';

export type WidgetSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DashboardMode = 'project' | 'product' | 'incident' | 'tasks';

export interface WidgetProps {
  projectId: string;
  projectKey: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /**
   * 2026-06-15: when 'product', the widget queries business_requests
   * instead of ph_issues. projectId is products.id, projectKey is
   * products.code in that mode.
   *
   * 2026-06-16: 'tasks' added for the Tasks Hub overview. Tasks widgets
   * query the `tasks` table via the existing useTaskItems hook; the
   * projectId / projectKey props are ignored in this mode.
   *
   * 2026-06-17: when 'incident', the widget queries ph_issues filtered to
   * issue_type='Production Incident' cross-project. projectId/projectKey
   * are both the 'INCIDENTS' sentinel.
   */
  mode?: DashboardMode;
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
  /**
   * 2026-06-15: when true, this widget is HIDDEN on product-hub dashboards
   * (no entry in the gallery, never seeded into the layout). Used for
   * widgets that have no business_requests equivalent — e.g. QA Defects,
   * Production Incidents, Scope Change, Time in Status. Project mode
   * unaffected.
   */
  hideOnProduct?: boolean;
  /**
   * 2026-06-17: when true, this widget is HIDDEN on incident-hub
   * dashboards. Used for widgets that don't apply to incidents — Epic
   * Progress (no Jira hierarchy linking), Scope Change (no scope tracking),
   * QA Defects (incident hub IS the incident data, defects are a peer not
   * a sub-stat), Production Incidents (the data already IS incidents).
   */
  hideOnIncident?: boolean;
}
