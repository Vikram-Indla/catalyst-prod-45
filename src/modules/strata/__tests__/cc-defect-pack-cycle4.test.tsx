/**
 * Module 8 Command Center — Cycle 4 remaining-defect proofs.
 *
 * CC-DEF-005 — relationship-based scoping of the FULL Needs attention feed:
 *   mixed-cycle fixtures reproduce Codex's Cycle 4 failure (2026/2027 project
 *   rows leaking into the 2028 negative-control cycle) and prove admission is
 *   by explicit relationship, with honest Global handling and no relabelling
 *   of cross-cycle data as global.
 * CC-DEF-003 — component-level keyboard interaction: a rendered JiraTable row
 *   is focused, receives Enter and Space, and navigation is asserted to the
 *   exact same route as mouse click; inner-control activation is guarded.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import {
  attentionRoute,
  classifyAttentionEntity,
  dedupeAttentionRows,
  partitionAttentionRows,
  type AttentionRelationships,
  type RawAttentionItem,
} from '@/modules/strata/pages/commandCenterLogic';

// ── CC-DEF-005 fixtures: two cycles, explicit relationships ──────────────────
const CYCLE_2026 = 'cycle-2026';
const CYCLE_2028 = 'cycle-4-regression-2028';

/** Elements per cycle — the ACTIVE set is what the page's cycle-keyed hook loads. */
const ELEMENTS_2026 = new Set(['el-theme-connectivity', 'el-obj-growth']);
const ELEMENTS_2028 = new Set(['el-theme-regression', 'el-obj-regression']);

const relFor = (activeCycleId: string, activeElements: ReadonlySet<string>): AttentionRelationships => ({
  activeCycleId,
  activeCycleElementIds: activeElements,
  kpiElementIds: new Map([
    ['kpi-2028-revenue', ['el-obj-regression']],   // linked to the 2028 cycle
    ['kpi-2026-nps', ['el-obj-growth']],           // linked to the 2026 cycle
    ['kpi-unlinked', []],                          // no element relationship at all
  ]),
  projectCardElementIds: new Map([
    // Codex Cycle 4 leak set — all four named rows:
    ['pc-5g-wave2', ['el-theme-connectivity']],        // 5G Rollout Wave 2 → 2026 theme
    ['pc-bundle-launch', ['el-obj-growth']],           // Bundle Launch Program (proof) → 2026 objective
    ['pc-cpq-sales', []],                              // CPQ & Sales Enablement → NO cycle relationship
    ['pc-real-project-1', ['el-theme-connectivity']],  // Real Project 1 → 2026 theme
    ['pc-2028-remediation', ['el-theme-regression']],  // genuinely 2028-scoped project
  ]),
  initiativeCycleId: new Map([['init-2026', CYCLE_2026], ['init-cycleless', null]]),
  decisionById: new Map([
    ['dec-2026', { snapshot_id: 'snap-2026', element_id: null }],
    ['dec-2028', { snapshot_id: 'snap-2028', element_id: null }],
    ['dec-global', { snapshot_id: null, element_id: null }],
  ]),
  actionDecisionId: new Map([['act-2028', 'dec-2028'], ['act-orphan', null]]),
  snapshotCycleId: new Map([['snap-2026', CYCLE_2026], ['snap-2028', CYCLE_2028]]),
});

const item = (o: Partial<RawAttentionItem>): RawAttentionItem => ({
  item_type: 'blocked_dependency', severity: 'critical', entity_type: 'project_card',
  entity_id: 'x', entity_name: null, detail: 'detail', due_date: null, owner_id: null, ...o,
});

/** The Cycle 4 leak population + legitimate rows for both cycles. */
const MIXED_FEED: RawAttentionItem[] = [
  item({ entity_id: 'pc-5g-wave2', entity_name: '5G Rollout Wave 2', due_date: '2026-07-31' }),
  item({ entity_id: 'pc-bundle-launch', entity_name: 'Bundle Launch Program (proof)', due_date: '2027-04-01' }),
  item({ entity_id: 'pc-cpq-sales', entity_name: 'CPQ & Sales Enablement' }),
  item({ entity_id: 'pc-real-project-1', entity_name: 'Real Project 1', detail: 'delivery dependency blocked' }),
  item({ entity_id: 'pc-2028-remediation', entity_name: 'Regression Remediation 2028', due_date: '2028-03-31' }),
  item({ item_type: 'missing_actual', entity_type: 'kpi', entity_id: 'kpi-2028-revenue', entity_name: 'Regression Revenue KPI', due_date: '2028-03-31' }),
  item({ item_type: 'missing_actual', entity_type: 'kpi', entity_id: 'kpi-2026-nps', entity_name: 'NPS KPI', due_date: '2026-06-30' }),
  item({ item_type: 'pending_benefit_validation', entity_type: 'benefit', entity_id: 'ben-1', entity_name: 'Cost Saving' }),
  item({ item_type: 'upload_rejections', entity_type: 'upload_run', entity_id: 'run-1', entity_name: 'RUN-1001' }),
  item({ item_type: 'overdue_action', entity_type: 'action', entity_id: 'act-2028', entity_name: 'Fix regression gap' }),
];

describe('CC-DEF-005 relationship-based attention scoping (Cycle 4 failure)', () => {
  it('NEGATIVE CONTROL — 2028 cycle: none of the four named 2026/2027 project rows are admitted', () => {
    const parts = partitionAttentionRows(dedupeAttentionRows(MIXED_FEED), relFor(CYCLE_2028, ELEMENTS_2028));
    const scopedNames = parts.scoped.map((r) => r.entity_name);
    expect(scopedNames).not.toContain('5G Rollout Wave 2');
    expect(scopedNames).not.toContain('Bundle Launch Program (proof)');
    expect(scopedNames).not.toContain('CPQ & Sales Enablement');
    expect(scopedNames).not.toContain('Real Project 1');
    // Its own Q1-2028 records ARE present via explicit relationships.
    expect(scopedNames).toContain('Regression Remediation 2028');
    expect(scopedNames).toContain('Regression Revenue KPI');
    expect(scopedNames).toContain('Fix regression gap');
    expect(parts.scoped).toHaveLength(3); // the selected-period total
  });

  it('cross-cycle rows are EXCLUDED, not relabelled Global (no hiding the defect)', () => {
    const parts = partitionAttentionRows(dedupeAttentionRows(MIXED_FEED), relFor(CYCLE_2028, ELEMENTS_2028));
    const globalNames = parts.global.map((r) => r.entity_name);
    const excludedNames = parts.excluded.map((r) => r.entity_name);
    // 2026-related rows: excluded outright, never in the Global section.
    expect(excludedNames).toEqual(expect.arrayContaining([
      '5G Rollout Wave 2', 'Bundle Launch Program (proof)', 'Real Project 1', 'NPS KPI',
    ]));
    expect(globalNames).not.toContain('5G Rollout Wave 2');
    expect(globalNames).not.toContain('Real Project 1');
    // Deliberately cycle-less sources land in the visible Global section:
    // relationship-less project, benefit (portfolio plane), upload run (data plane).
    expect(globalNames).toEqual(expect.arrayContaining(['CPQ & Sales Enablement', 'Cost Saving', 'RUN-1001']));
    expect(parts.global).toHaveLength(3);
  });

  it('baseline FY2026 retains its valid scoped alerts and its total', () => {
    const parts = partitionAttentionRows(dedupeAttentionRows(MIXED_FEED), relFor(CYCLE_2026, ELEMENTS_2026));
    const scopedNames = parts.scoped.map((r) => r.entity_name);
    expect(scopedNames).toEqual(expect.arrayContaining([
      '5G Rollout Wave 2', 'Bundle Launch Program (proof)', 'Real Project 1', 'NPS KPI',
    ]));
    expect(scopedNames).not.toContain('Regression Remediation 2028');
    expect(parts.scoped).toHaveLength(4);
    expect(parts.global).toHaveLength(3); // same Global population in every cycle view
  });

  it('admission is relationship-based, not date-based: a 2026-dated row with a 2028 relationship is scoped', () => {
    const rel = relFor(CYCLE_2028, ELEMENTS_2028);
    const oldDatedBut2028Linked = item({ entity_id: 'pc-2028-remediation', entity_name: 'Old-dated but 2028-linked', due_date: '2026-01-01' });
    const parts = partitionAttentionRows([oldDatedBut2028Linked], rel);
    expect(parts.scoped.map((r) => r.entity_name)).toContain('Old-dated but 2028-linked');
  });

  it('decision/action classification follows snapshot→cycle and action→decision relationships', () => {
    const rel = relFor(CYCLE_2028, ELEMENTS_2028);
    expect(classifyAttentionEntity('decision', 'dec-2028', rel)).toBe('scoped');
    expect(classifyAttentionEntity('decision', 'dec-2026', rel)).toBe('excluded');
    expect(classifyAttentionEntity('decision', 'dec-global', rel)).toBe('global');
    expect(classifyAttentionEntity('action', 'act-2028', rel)).toBe('scoped');
    expect(classifyAttentionEntity('action', 'act-orphan', rel)).toBe('global');
  });

  it('CC-DEF-004 regression guard: dedupe still reconciles identical rows before partition', () => {
    const tripled = [...MIXED_FEED, MIXED_FEED[3], MIXED_FEED[3]]; // Real Project 1 ×3
    const parts = partitionAttentionRows(dedupeAttentionRows(tripled), relFor(CYCLE_2026, ELEMENTS_2026));
    expect(parts.scoped.filter((r) => r.entity_name === 'Real Project 1')).toHaveLength(1);
    expect(parts.scoped).toHaveLength(4); // total unchanged by duplicates
  });
});

// ── CC-DEF-003: component-level keyboard interaction ─────────────────────────
interface HarnessRow { id: string; name: string; path: string | null; label: string }

const HARNESS_LOOKUPS = {
  kpiSlug: (id: string) => (id === 'k1' ? 'revenue-growth' : null),
  benefitSlug: (id: string) => (id === 'b1' ? 'cost-saving' : null),
  portfolioSlug: () => null,
  projectCardSlug: (id: string) => (id === 'pc1' ? 'real-project-1' : null),
  elementSlug: () => null,
  runKey: (id: string) => (id === 'run1' ? 'RUN-1001' : null),
  decisionSnapshotKey: (id: string) => (id === 'd1' ? 'SNAP-1001' : null),
  actionSnapshotKey: () => null,
};

const HARNESS_ROWS: HarnessRow[] = [
  { id: 'r1', name: 'Real Project 1', path: attentionRoute('project_card', 'pc1', HARNESS_LOOKUPS), label: 'Blocked dependency, Real Project 1' },
  { id: 'r2', name: 'Revenue KPI', path: attentionRoute('kpi', 'k1', HARNESS_LOOKUPS), label: 'Missing actual, Revenue KPI' },
  { id: 'r3', name: 'Cost Saving', path: attentionRoute('benefit', 'b1', HARNESS_LOOKUPS), label: 'Benefit validation, Cost Saving' },
  { id: 'r4', name: 'RUN-1001', path: attentionRoute('upload_run', 'run1', HARNESS_LOOKUPS), label: 'Upload rejections, RUN-1001' },
  { id: 'r5', name: 'Gate decision', path: attentionRoute('decision', 'd1', HARNESS_LOOKUPS), label: 'Overdue action, Gate decision' },
  { id: 'r6', name: 'Unresolved KPI', path: attentionRoute('kpi', 'nope', HARNESS_LOOKUPS), label: 'Missing actual, Unresolved KPI' },
];

const COLS: Column<HarnessRow>[] = [
  { id: 'name', label: 'Item', flex: true, cell: ({ row }) => <span data-testid={`cell-${row.id}`}>{row.name}</span> },
];

function Harness() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <div data-testid="loc">{location.pathname}</div>
      <JiraTable<HarnessRow>
        columns={COLS}
        data={HARNESS_ROWS}
        getRowId={(r) => r.id}
        onRowClick={(r) => { if (r.path) navigate(r.path); }}
        rowAriaLabel={(r) => r.label}
        showRowCount={false}
        ariaLabel="Items needing attention"
      />
    </>
  );
}

const renderHarness = () => render(
  <MemoryRouter initialEntries={['/strata']}><Harness /></MemoryRouter>,
);

const rowByLabel = (label: string) => screen.getByLabelText(label, { selector: 'tr' });

describe('CC-DEF-003 keyboard actionability (component-level)', () => {
  it.each([
    ['Blocked dependency, Real Project 1', '/strata/execution/real-project-1'],
    ['Missing actual, Revenue KPI', '/strata/kpis/revenue-growth'],
    ['Benefit validation, Cost Saving', '/strata/portfolio/benefits/cost-saving'],
    ['Upload rejections, RUN-1001', '/strata/data/runs/RUN-1001'],
    ['Overdue action, Gate decision', '/strata/reviews/SNAP-1001'],
  ])('Enter on the focused "%s" row navigates to %s (same as mouse)', (label, expected) => {
    const r = renderHarness();
    const row = rowByLabel(label);
    expect(row).toHaveProperty('tabIndex', 0); // in the Tab sequence
    row.focus();
    expect(document.activeElement).toBe(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByTestId('loc').textContent).toBe(expected);
    r.unmount();
  });

  it('Space activates the same route as Enter and mouse click', () => {
    const r = renderHarness();
    const row = rowByLabel('Missing actual, Revenue KPI');
    row.focus();
    fireEvent.keyDown(row, { key: ' ' });
    expect(screen.getByTestId('loc').textContent).toBe('/strata/kpis/revenue-growth');
    r.unmount();
  });

  it('mouse click reaches the identical destination', () => {
    const r = renderHarness();
    fireEvent.click(rowByLabel('Blocked dependency, Real Project 1'));
    expect(screen.getByTestId('loc').textContent).toBe('/strata/execution/real-project-1');
    r.unmount();
  });

  it('unresolved rows fall back to the owning list surface and stay operable', () => {
    const r = renderHarness();
    const row = rowByLabel('Missing actual, Unresolved KPI');
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByTestId('loc').textContent).toBe('/strata/kpis');
    r.unmount();
  });

  it('keydown originating from an inner control does NOT activate the row', () => {
    const r = renderHarness();
    const inner = screen.getByTestId('cell-r1');
    fireEvent.keyDown(inner, { key: 'Enter' });
    expect(screen.getByTestId('loc').textContent).toBe('/strata'); // unchanged
    r.unmount();
  });
});
