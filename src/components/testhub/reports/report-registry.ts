/**
 * REPORT_REGISTRY — single source of truth for the TestHub Reports hub.
 * Feature: CAT-REPORTS-HUB-20260703-001 (S1.1 · Phase 2 Lane B).
 *
 * 23 entries from the Phase 0 disposition matrix (PHASE0_DATA_CONTRACT_PROOF.md §S0.3),
 * plus 3 formerly-CUT reports (defect-closure-trend, approval-age, points-burndown)
 * unlocked by the D-004 status-history capture DDL (20260703290000).
 * ALL entries are status 'wired' as of Lane B:
 * - dedicated Bodies under ./bodies (Phase 2 Lane A; legacy standalone pages deleted)
 * - Lab-derived reports render through WiredReportBody → useRealTestReportData
 *   (live tm_* / ph_* Supabase data; the seeded generator is deleted).
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

/** Lazy adapter: renders the Lab ReportCanvas for one slug with LIVE Supabase data. */
const wiredBody = (slug: string): ReportDefinition['component'] =>
  lazy(async () => {
    const mod = await import('./WiredReportBody');
    const WiredBody = mod.default;
    const Body: React.ComponentType = () => React.createElement(WiredBody, { slug });
    return { default: Body };
  });

export const REPORT_REGISTRY: ReportDefinition[] = [
  // ─── Execution (Lab-derived, wired — Phase 2 Lane B) ──────────────────
  {
    id: 'execution-overview',
    label: 'Execution Overview',
    description: 'Status breakdown and overall progress across all runs.',
    category: 'Execution',
    component: wiredBody('execution-overview'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'execution-summary',
    label: 'Execution Summary',
    description: 'Per-cycle summary: total, passed, failed, blocked, pass rate.',
    category: 'Execution',
    component: wiredBody('execution-summary'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'execution-burndown',
    label: 'Execution Burndown',
    description: 'Remaining unexecuted tests over time vs ideal line.',
    category: 'Execution',
    component: wiredBody('execution-burndown'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'execution-burnup',
    label: 'Execution Burnup',
    description: 'Cumulative executed and cumulative passed over time.',
    category: 'Execution',
    component: wiredBody('execution-burnup'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'execution-distribution',
    label: 'Execution Distribution',
    description: 'Run count broken down by status.',
    category: 'Execution',
    component: wiredBody('execution-distribution'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'execution-history',
    label: 'Execution History',
    description: 'Full history of runs with case, executor, result, timestamp.',
    category: 'Execution',
    component: wiredBody('execution-history'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },

  // ─── Cases (Lab-derived, wired) ───────────────────────────────────────
  {
    id: 'case-distribution',
    label: 'Case Distribution',
    description: 'Test cases grouped by status, priority, and type.',
    category: 'Cases',
    component: wiredBody('case-distribution'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'case-usage',
    label: 'Case Usage',
    description: 'How often each test case appears in cycles and executions.',
    category: 'Cases',
    component: wiredBody('case-usage'),
    status: 'wired',
    usesProjectPicker: true,
  },

  // ─── Defects ───────────────────────────────────────────────────────────
  {
    id: 'defect-summary',
    label: 'Defect Summary',
    description: 'QA defects — open counts, severity, test linkage. Incident reporting lives in Incident Hub → Reports.',
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
    component: wiredBody('defect-impact'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'defect-trend',
    label: 'Defect Trend',
    description: 'Defect creation trend over time.',
    category: 'Defects',
    component: wiredBody('defect-trend'),
    status: 'wired',
    usesProjectPicker: true,
    usesDateRange: true,
  },
  {
    id: 'defect-closure-trend',
    label: 'Defect Closure Trend',
    description: 'Raised vs closed defects per week (closure dates captured from 2026-07-03).',
    category: 'Defects',
    component: lazy(() => import('./bodies/DefectClosureTrendBody')),
    status: 'wired',
    usesProjectPicker: true,
  },

  // ─── Multi-Cycle (Lab-derived, wired) ─────────────────────────────────
  {
    id: 'multi-cycle-comparison',
    label: 'Multi-Cycle Comparison',
    description: 'Side-by-side pass rate comparison across cycles.',
    category: 'Multi-Cycle',
    component: wiredBody('multi-cycle-comparison'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'multi-cycle-summary',
    label: 'Multi-Cycle Summary',
    description: 'One row per cycle — aggregated metrics.',
    category: 'Multi-Cycle',
    component: wiredBody('multi-cycle-summary'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'multi-cycle-detail',
    label: 'Multi-Cycle Detail',
    description: 'Per-case results across every selected cycle.',
    category: 'Multi-Cycle',
    component: wiredBody('multi-cycle-detail'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'multi-cycle-distribution',
    label: 'Multi-Cycle Distribution',
    description: 'Status distribution pivot: status × cycle.',
    category: 'Multi-Cycle',
    component: wiredBody('multi-cycle-distribution'),
    status: 'wired',
    usesProjectPicker: true,
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
  {
    id: 'points-burndown',
    label: 'Points Burndown',
    description: 'Sprint burndown — points when estimated, item counts otherwise.',
    category: 'Sprint',
    component: lazy(() => import('./bodies/PointsBurndownBody')),
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
  {
    id: 'approval-age',
    label: 'Approval Age',
    description: 'How long test-plan approvals and release signoffs wait for a decision.',
    category: 'Governance',
    component: lazy(() => import('./bodies/ApprovalAgeBody')),
    status: 'wired',
  },

  // ─── CAT-TESTHUB-V2 quality-plane reports (wired) ─────────────────────
  {
    id: 'sprint-test-health',
    label: 'Sprint Test Health',
    description: 'Latest pass/warn/block gate per sprint: coverage, execution, blockers, draft leaks.',
    category: 'Sprint',
    component: lazy(() => import('./bodies/SprintTestHealthBody')),
    status: 'wired',
  },
  {
    id: 'version-variance',
    label: 'Version Variance',
    description: 'Snapshot-vs-repository drift in active cycles and how each was explicitly resolved.',
    category: 'Governance',
    component: lazy(() => import('./bodies/VersionVarianceBody')),
    status: 'wired',
  },
  {
    id: 'release-readiness',
    label: 'Release Readiness',
    description: 'Live test gate per release: execution health, blocking defects, evidence gaps — blocks sort first.',
    category: 'Governance',
    component: lazy(() => import('./bodies/ReleaseReadinessBody')),
    status: 'wired',
  },
  {
    id: 'defect-leakage',
    label: 'Defect Leakage & Retest',
    description: 'Caught-by-testing vs leaked defects, with retest state for fixed test-caught defects.',
    category: 'Defects',
    component: lazy(() => import('./bodies/DefectLeakageBody')),
    status: 'wired',
  },
  {
    id: 'ai-generation-audit',
    label: 'AI Generation Audit',
    description: 'Every TestHub AI call: who, operation, model, tokens, outcome.',
    category: 'Governance',
    component: lazy(() => import('./bodies/AiGenerationAuditBody')),
    status: 'wired',
  },

  // ─── Traceability (Lab-derived, wired) ────────────────────────────────
  {
    id: 'traceability-summary',
    label: 'Traceability Summary',
    description: 'Requirement coverage: linked issues with case count and pass rate.',
    category: 'Traceability',
    component: wiredBody('traceability-summary'),
    status: 'wired',
    usesProjectPicker: true,
  },
  {
    id: 'traceability-detail',
    label: 'Traceability Detail',
    description: 'Requirement → test case → execution → defect chain.',
    category: 'Traceability',
    component: wiredBody('traceability-detail'),
    status: 'wired',
    usesProjectPicker: true,
  },
];

export function getReportDefinition(id: string | undefined): ReportDefinition | undefined {
  if (!id) return undefined;
  return REPORT_REGISTRY.find((r) => r.id === id);
}

/** Flagship report — default selection when no :reportSlug is present (S1.5). */
export const DEFAULT_REPORT_ID =
  REPORT_REGISTRY.find((r) => r.id === 'sprint-testing-status')?.id ?? REPORT_REGISTRY[0].id;
