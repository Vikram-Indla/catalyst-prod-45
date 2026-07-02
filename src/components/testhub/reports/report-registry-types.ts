/**
 * Report registry types — CAT-REPORTS-HUB-20260703-001 (S1.1).
 * Generalizes the project-hub dashboard widget-registry pattern for the
 * TestHub Reports hub. Each report is a lazily loaded Body component;
 * bodies own their data hooks for now.
 */
import type React from 'react';

export type ReportCategory =
  | 'Execution'
  | 'Cases'
  | 'Defects'
  | 'Multi-Cycle'
  | 'Project'
  | 'Sprint'
  | 'People'
  | 'Governance'
  | 'Traceability';

/** Bodies own their data hooks for now — no props flow from the shell. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReportBodyProps {}

export interface ReportDefinition {
  /** slug, e.g. 'sprint-testing-status' — used as the :reportSlug URL param */
  id: string;
  label: string;
  description: string;
  category: ReportCategory;
  component: React.LazyExoticComponent<React.ComponentType<ReportBodyProps>>;
  /** 'demo' => seeded-data banner shown above the body */
  status: 'wired' | 'demo';
  usesDateRange?: boolean;
  usesProjectPicker?: boolean;
}
