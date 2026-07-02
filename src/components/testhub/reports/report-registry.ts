/**
 * REPORT_REGISTRY — single source of truth for the TestHub Reports hub.
 * Feature: CAT-REPORTS-HUB-20260703-001 (S1.1).
 *
 * 23 entries from the Phase 0 disposition matrix (PHASE0_DATA_CONTRACT_PROOF.md §S0.3).
 * - status 'wired'  → real-data Body under ./bodies (Phase 2 Lane A; legacy standalone pages deleted).
 * - status 'demo'   → Lab-derived report rendered through LabReportBody (seeded data,
 *                     DEMO banner shown by ReportRenderer). Real wiring lands in Phase 2 Lane B.
 */
import React, { lazy } from 'react';
import type { ReportCategory, ReportDefinition } from './report-registry-types';

/** Category display order for the hub navigator. */
export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  'Execution',
  'Cases',
  'Defects',
  'Multi-Cycle',
  'Project',
  'Sprint',
  'People',
  'Governance',
  'Traceability',
];

/** Lazy adapter: renders the existing Lab ReportCanvas for one slug (seeded data). */
const labBody = (slug: string): ReportDefinition['component'] =>
  lazy(async () => {
    const mod = await import('./LabReportBody');
    const LabBody = mod.default;
    const Body: React.ComponentType = () => React.createElement(LabBody, { slug });
    return { default: Body };
  });

export const REPORT_REGISTRY: ReportDefinition[] = [
  // ─── Execution (Lab-derived, demo until Phase 2 Lane B) ────────────────
  {
    id: 'execution-overview',
    label: 'Execution Overview',
    description: 'Status breakdown and overall progress across all runs.',
    category: 'Execution',
    component: labBody('execution-overview'),
    status: 'demo',
    usesDateRange: true,
  },
  {
    id: 'execution-summary',
    label: 'Execution Summary',
    description: 'Per-cycle summary: total, passed, failed, blocked, pass rate.',
    category: 'Execution',
    component: labBody('execution-summary'),
    status: 'demo',
    usesDateRange: true,
  },
  {
    id: 'execution-burndown',
    label: 'Execution Burndown',
    description: 'Remaining unexecuted tests over time vs ideal line.',
    category: 'Execution',
    component: labBody('execution-burndown'),
    status: 'demo',
    usesDateRange: true,
  },
  {
    id: 'execution-burnup',
    label: 'Execution Burnup',
    description: 'Cumulative executed and cumulative passed over time.',
    category: 'Execution',
    component: labBody('execution-burnup'),
    status: 'demo',
    usesDateRange: true,
  },
  {
    id: 'execution-distribution',
    label: 'Execution Distribution',
    description: 'Run count broken down by status.',
    category: 'Execution',
    component: labBody('execution-distribution'),
    status: 'demo',
    usesDateRange: true,
  },
  {
    id: 'execution-history',
    label: 'Execution History',
    description: 'Full history of runs with case, executor, result, timestamp.',
    category: 'Execution',
    component: labBody('execution-history'),
    status: 'demo',
    usesDateRange: true,
  },

  // ─── Cases (Lab-derived, demo) ─────────────────────────────────────────
  {
    id: 'case-distribution',
    label: 'Case Distribution',
    description: 'Test cases grouped by status, priority, and type.',
    category: 'Cases',
    component: labBody('case-distribution'),
    status: 'demo',
  },
  {
    id: 'case-usage',
    label: 'Case Usage',
    description: 'How often each test case appears in cycles and executions.',
    category: 'Cases',
    component: labBody('case-usage'),
    status: 'demo',
  },

  // ─── Defects ───────────────────────────────────────────────────────────
  {
    id: 'defect-summary',
    // LANE-C: incident half moves to /incident-hub/reports; title stays "Defects & Incidents" until then.
    label: 'Defects & Incidents',
    description: 'Defects and production incidents — open counts, test linkage, regression gaps.',
    category: 'Defects',
    component: lazy(() => import('./bodies/DefectSummaryBody')),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'defect-impact',
    label: 'Defect Impact',
    description: 'Defects linked to test cases — severity and impact.',
    category: 'Defects',
    component: labBody('defect-impact'),
    status: 'demo',
  },
  {
    id: 'defect-trend',
    label: 'Defect Trend',
    description: 'Defect creation trend over time.',
    category: 'Defects',
    component: labBody('defect-trend'),
    status: 'demo',
    usesDateRange: true,
  },

  // ─── Multi-Cycle (Lab-derived, demo) ───────────────────────────────────
  {
    id: 'multi-cycle-comparison',
    label: 'Multi-Cycle Comparison',
    description: 'Side-by-side pass rate comparison across cycles.',
    category: 'Multi-Cycle',
    component: labBody('multi-cycle-comparison'),
    status: 'demo',
  },
  {
    id: 'multi-cycle-summary',
    label: 'Multi-Cycle Summary',
    description: 'One row per cycle — aggregated metrics.',
    category: 'Multi-Cycle',
    component: labBody('multi-cycle-summary'),
    status: 'demo',
  },
  {
    id: 'multi-cycle-detail',
    label: 'Multi-Cycle Detail',
    description: 'Per-case results across every selected cycle.',
    category: 'Multi-Cycle',
    component: labBody('multi-cycle-detail'),
    status: 'demo',
  },
  {
    id: 'multi-cycle-distribution',
    label: 'Multi-Cycle Distribution',
    description: 'Status distribution pivot: status × cycle.',
    category: 'Multi-Cycle',
    component: labBody('multi-cycle-distribution'),
    status: 'demo',
  },

  // ─── Project (wired standalone reports) ────────────────────────────────
  {
    id: 'project-testing-status',
    label: 'Project Testing Status',
    description: 'Coverage, execution distribution, defects and governance mismatches for a project.',
    category: 'Project',
    component: lazy(() => import('./bodies/ProjectTestingStatusBody')),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'product-status',
    label: 'Product / Business Request Status',
    description: 'Testing status for an epic (business request proxy) and its child stories.',
    category: 'Project',
    component: lazy(() => import('./bodies/ProductStatusBody')),
    status: 'wired',
  },

  // ─── Sprint (wired) ────────────────────────────────────────────────────
  {
    id: 'sprint-testing-status',
    label: 'Sprint Testing Status',
    description: 'Coverage and execution status for the stories in a sprint.',
    category: 'Sprint',
    component: lazy(() => import('./bodies/SprintTestingStatusBody')),
    status: 'wired',
  },

  // ─── People (wired) ────────────────────────────────────────────────────
  {
    id: 'tester-performance',
    label: 'Tester Performance',
    description: 'Workload and execution results for one tester.',
    category: 'People',
    component: lazy(() => import('./bodies/TesterPerformanceBody')),
    status: 'wired',
  },
  {
    id: 'team-performance',
    label: 'Team Performance',
    description: 'Per-tester breakdown of assigned cases and execution results for a project.',
    category: 'People',
    component: lazy(() => import('./bodies/TeamPerformanceBody')),
    status: 'wired',
    usesProjectPicker: true,
  },

  // ─── Governance (wired) ────────────────────────────────────────────────
  {
    id: 'governance',
    label: 'Governance & Mismatch',
    description: 'Stories whose delivery status contradicts their test results.',
    category: 'Governance',
    component: lazy(() => import('./bodies/GovernanceBody')),
    status: 'wired',
    usesProjectPicker: true,
  },

  // ─── Traceability (Lab-derived, demo) ──────────────────────────────────
  {
    id: 'traceability-summary',
    label: 'Traceability Summary',
    description: 'Requirement coverage: linked issues with case count and pass rate.',
    category: 'Traceability',
    component: labBody('traceability-summary'),
    status: 'demo',
  },
  {
    id: 'traceability-detail',
    label: 'Traceability Detail',
    description: 'Requirement → test case → execution → defect chain.',
    category: 'Traceability',
    component: labBody('traceability-detail'),
    status: 'demo',
  },
];

export function getReportDefinition(id: string | undefined): ReportDefinition | undefined {
  if (!id) return undefined;
  return REPORT_REGISTRY.find((r) => r.id === id);
}

/** Flagship report — default selection when no :reportSlug is present (S1.5). */
export const DEFAULT_REPORT_ID =
  REPORT_REGISTRY.find((r) => r.id === 'sprint-testing-status')?.id ?? REPORT_REGISTRY[0].id;
