/**
 * Widget type definitions - extracted to break circular dependencies
 * between widget-registry.ts and individual widget components
 */
import type { ComponentType } from 'react';

export type WidgetSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WidgetProps {
  projectId: string;
  projectKey: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /**
   * 2026-06-15: when 'product', the widget queries business_requests
   * instead of ph_issues. projectId is products.id, projectKey is
   * products.code in that mode.
   */
  mode?: 'project' | 'product';
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
}
