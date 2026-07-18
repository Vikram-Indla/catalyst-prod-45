/**
 * Module 8 Command Center defect pack — CAT-STRATA-CCDEF-20260718-001.
 *
 * Covers, per the pack's required automated coverage:
 *  CC-DEF-005 — scoping keyed by cycle; cross-cycle fixtures proving global and
 *               period records are never conflated (Cycle 4 Regression negative control).
 *  CC-DEF-002 — official score-series identity (one score per period, locked wins,
 *               Q2 100-vs-96.5 case) and deterministic delta from the same series.
 *  CC-DEF-001 — narrative truth table: all-100 no-drag state + degraded control.
 *  CC-DEF-004 — stable-key dedup and total reconciliation.
 *  CC-DEF-003 — route generation for every alert entity type + context-preserving
 *               return parameter where the route supports it.
 */
import { describe, expect, it } from 'vitest';
import {
  attentionRoute,
  attentionRowKey,
  computeScoreDelta,
  dedupeAttentionRows,
  officialTrendSeries,
  scopeAiOutputs,
  scopeOpenDecisions,
  selectDragPerspective,
  type RawAttentionItem,
} from '@/modules/strata/pages/commandCenterLogic';

// ── Shared fixtures ──────────────────────────────────────────────────────────
const PERIODS = [
  { id: 'p-q1-26', name: 'Q1 FY2026', starts_on: '2026-01-01' },
  { id: 'p-q2-26', name: 'Q2 FY2026', starts_on: '2026-04-01' },
  { id: 'p-q1-c4', name: 'Q1 Regression', starts_on: '2028-03-31' },
];

const CYCLE_2026 = 'cycle-2026';
const CYCLE_4 = 'cycle-4-regression';

const SNAPSHOTS = [
  { id: 'snap-26-a', cycle_id: CYCLE_2026 },
  { id: 'snap-26-b', cycle_id: CYCLE_2026 },
  { id: 'snap-c4-a', cycle_id: CYCLE_4 },
];

// ── CC-DEF-002: official trend identity ──────────────────────────────────────
describe('CC-DEF-002 officialTrendSeries', () => {
  const instances = [
    { id: 'inst-q1-live', period_id: 'p-q1-26', status: 'live' },
    { id: 'inst-q2-live', period_id: 'p-q2-26', status: 'live' },
    { id: 'inst-q2-locked', period_id: 'p-q2-26', status: 'locked' },
  ];
  const raw = [
    { instanceId: 'inst-q1-live', periodId: 'p-q1-26', score: 92, statusKey: 'on_track', slug: 'sc-q1' },
    // The defect case: Q2 FY2026 carries BOTH an unexplained 100 (live) and 96.5 (locked).
    { instanceId: 'inst-q2-live', periodId: 'p-q2-26', score: 100, statusKey: 'on_track', slug: 'sc-q2-live' },
    { instanceId: 'inst-q2-locked', periodId: 'p-q2-26', score: 96.5, statusKey: 'on_track', slug: 'sc-q2-locked' },
  ];

  it('renders exactly ONE official score per period — locked (approved) wins over live', () => {
    const series = officialTrendSeries(raw, instances, PERIODS);
    expect(series).toHaveLength(2);
    const q2 = series.find((p) => p.label === 'Q2 FY2026')!;
    expect(q2.score).toBe(96.5);
    expect(q2.officialState).toBe('locked');
    expect(q2.revisions).toBe(2); // the superseded revision is disclosed, not plotted
    // Evidence link retains the EXACT identity of the official instance.
    expect(q2.slug).toBe('sc-q2-locked');
    expect(q2.instanceId).toBe('inst-q2-locked');
  });

  it('orders by period start and keeps single-instance periods untouched', () => {
    const series = officialTrendSeries(raw, instances, PERIODS);
    expect(series.map((p) => p.label)).toEqual(['Q1 FY2026', 'Q2 FY2026']);
    expect(series[0]).toMatchObject({ score: 92, revisions: 1, slug: 'sc-q1' });
  });

  it('is deterministic when approval states tie (stable instanceId tie-break)', () => {
    const tied = [
      { instanceId: 'b-inst', periodId: 'p-q1-26', score: 80, statusKey: null, slug: 'b' },
      { instanceId: 'a-inst', periodId: 'p-q1-26', score: 70, statusKey: null, slug: 'a' },
    ];
    const insts = [
      { id: 'a-inst', period_id: 'p-q1-26', status: 'live' },
      { id: 'b-inst', period_id: 'p-q1-26', status: 'live' },
    ];
    const first = officialTrendSeries(tied, insts, PERIODS);
    const again = officialTrendSeries([...tied].reverse(), insts, PERIODS);
    expect(first).toEqual(again);
    expect(first[0].instanceId).toBe('a-inst');
  });

  it('delta derives from the SAME official series (96.5 − 92, never 100-based)', () => {
    const series = officialTrendSeries(raw, instances, PERIODS);
    const delta = computeScoreDelta(series, 'Q2 FY2026')!;
    expect(delta.priorLabel).toBe('Q1 FY2026');
    expect(delta.delta).toBeCloseTo(4.5);
  });

  it('delta is null with fewer than two official points', () => {
    const series = officialTrendSeries([raw[0]], instances, PERIODS);
    expect(computeScoreDelta(series, 'Q1 FY2026')).toBeNull();
  });
});

// ── CC-DEF-001: narrative truth table ────────────────────────────────────────
describe('CC-DEF-001 selectDragPerspective', () => {
  const persp = (name: string, score: number, has_data = true) =>
    ({ perspective_id: name.toLowerCase(), name, score, has_data });

  it('all perspectives 100 / On track → NOTHING drags (truthful no-drag state)', () => {
    const calc = {
      has_data: true,
      score: 100,
      perspectives: [persp('Financial', 100), persp('Customer', 100), persp('Internal', 100), persp('Learning', 100)],
    };
    expect(selectDragPerspective(calc)).toBeNull();
  });

  it('degraded-perspective control: the below-enterprise perspective is named', () => {
    const calc = {
      has_data: true,
      score: 90,
      perspectives: [persp('Financial', 60), persp('Customer', 100), persp('Internal', 100)],
    };
    expect(selectDragPerspective(calc)?.name).toBe('Financial');
  });

  it('causal text comes from the same score population — worst-at-enterprise-score does not drag', () => {
    // Every scored perspective equals the enterprise score: nothing is below it.
    const calc = { has_data: true, score: 87, perspectives: [persp('A', 87), persp('B', 87)] };
    expect(selectDragPerspective(calc)).toBeNull();
  });

  it('no data / no scored perspectives → null (zero-assumption)', () => {
    expect(selectDragPerspective(null)).toBeNull();
    expect(selectDragPerspective({ has_data: false, score: 0, perspectives: [] })).toBeNull();
    expect(selectDragPerspective({
      has_data: true, score: 50, perspectives: [persp('A', 40, false)],
    })).toBeNull();
  });
});

// ── CC-DEF-004: stable-key deduplication + total reconciliation ──────────────
describe('CC-DEF-004 dedupeAttentionRows', () => {
  const blocked = (overrides: Partial<RawAttentionItem> = {}): RawAttentionItem => ({
    item_type: 'blocked_dependency',
    severity: 'critical',
    entity_type: 'project_card',
    entity_id: 'proj-real-1',
    entity_name: 'Real Project 1',
    detail: 'delivery dependency blocked',
    due_date: null,
    owner_id: null,
    ...overrides,
  });

  it('three identical "Real Project 1 / delivery dependency blocked / —" rows reconcile to ONE', () => {
    const rows = dedupeAttentionRows([blocked(), blocked(), blocked()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].duplicates).toBe(3);
  });

  it('total equals the unique displayed population', () => {
    const raw = [blocked(), blocked(), blocked(), blocked({ detail: 'funding dependency blocked' })];
    const rows = dedupeAttentionRows(raw);
    expect(rows).toHaveLength(2); // panel count === rows.length by construction
  });

  it('rows with distinct relationship identity/details stay distinct', () => {
    const rows = dedupeAttentionRows([
      blocked(),
      blocked({ entity_id: 'proj-real-2', entity_name: 'Real Project 2' }),
      blocked({ due_date: '2026-08-01' }),
      blocked({ severity: 'warning' }),
    ]);
    expect(rows).toHaveLength(4);
  });

  it('key is stable and position-free — no index component', () => {
    const a = attentionRowKey(blocked());
    const reordered = dedupeAttentionRows([blocked({ detail: 'x' }), blocked()]);
    expect(reordered.find((r) => r.detail === 'delivery dependency blocked')?.key).toBe(a);
    expect(a).not.toMatch(/\|\d+$/);
  });
});

// ── CC-DEF-005: cycle/period context integrity ───────────────────────────────
describe('CC-DEF-005 scopeOpenDecisions', () => {
  const decisions = [
    { id: 'd1', status: 'open', snapshot_id: 'snap-26-a', element_id: null },    // 2026 cycle
    { id: 'd2', status: 'open', snapshot_id: 'snap-c4-a', element_id: null },    // cycle 4
    { id: 'd3', status: 'open', snapshot_id: null, element_id: 'el-26' },        // 2026 theme
    { id: 'd4', status: 'open', snapshot_id: null, element_id: null },           // deliberate GLOBAL
    { id: 'd5', status: 'decided', snapshot_id: 'snap-c4-a', element_id: null }, // not open
  ];

  it('baseline FY2026: counts only 2026-linked decisions; globals are separate', () => {
    const r = scopeOpenDecisions(decisions, SNAPSHOTS, new Set(['el-26']), CYCLE_2026);
    expect(r.scoped).toBe(2);      // d1 (snapshot) + d3 (cycle element)
    expect(r.global).toBe(1);      // d4 — labelled, never in the scoped headline
    expect(r.otherCycle).toBe(1);  // d2 belongs to Cycle 4
  });

  it('NEGATIVE CONTROL — Cycle 4 Regression/Q1 must not silently include 2026 or global records', () => {
    const r = scopeOpenDecisions(decisions, SNAPSHOTS, new Set<string>(), CYCLE_4);
    expect(r.scoped).toBe(1);      // d2 only
    expect(r.global).toBe(1);      // d4 stays global — excluded from the scoped total
    expect(r.otherCycle).toBe(2);  // d1 (2026 snapshot) + d3 (element not in Cycle 4's set)
  });

  it('closed decisions never count anywhere', () => {
    const r = scopeOpenDecisions(decisions, SNAPSHOTS, new Set<string>(), CYCLE_4);
    expect(r.scoped + r.global + r.otherCycle).toBe(4); // d5 excluded
  });
});

describe('CC-DEF-005 scopeAiOutputs', () => {
  const outputs = [
    { id: 'ai-1', snapshot_id: 'snap-26-a' },
    { id: 'ai-2', snapshot_id: 'snap-c4-a' },
    { id: 'ai-3', snapshot_id: null }, // live-data advisory — global
  ];

  it('Cycle 4 view excludes the 2026 advisory and labels the unlinked one Global', () => {
    const kept = scopeAiOutputs(outputs, SNAPSHOTS, CYCLE_4);
    expect(kept.map((o) => o.id)).toEqual(['ai-2', 'ai-3']);
    expect(kept.find((o) => o.id === 'ai-2')?.scopeLabel).toBe('cycle');
    expect(kept.find((o) => o.id === 'ai-3')?.scopeLabel).toBe('global');
  });

  it('2026 view symmetrically excludes the Cycle 4 advisory', () => {
    const kept = scopeAiOutputs(outputs, SNAPSHOTS, CYCLE_2026);
    expect(kept.map((o) => o.id)).toEqual(['ai-1', 'ai-3']);
  });
});

// ── CC-DEF-003: route generation for every alert type ────────────────────────
describe('CC-DEF-003 attentionRoute', () => {
  const lookups = {
    kpiSlug: (id: string) => (id === 'k1' ? 'revenue-growth' : null),
    benefitSlug: (id: string) => (id === 'b1' ? 'cost-saving' : null),
    portfolioSlug: (id: string) => (id === 'pf1' ? 'transformation' : null),
    projectCardSlug: (id: string) => (id === 'pc1' ? 'real-project-1' : null),
    elementSlug: (id: string) => (id === 'el1' ? 'grow-market-share' : null),
    runKey: (id: string) => (id === 'run1' ? 'RUN-1001' : null),
    decisionSnapshotKey: (id: string) => (id === 'd1' ? 'SNAP-1001' : null),
    actionSnapshotKey: (id: string) => (id === 'a1' ? 'SNAP-1001' : null),
  };
  const FROM = '/strata';

  it.each([
    ['kpi', 'k1', '/strata/kpis/revenue-growth'],
    ['benefit', 'b1', '/strata/portfolio/benefits/cost-saving'],
    ['portfolio', 'pf1', `/strata/portfolio/transformation?from=${encodeURIComponent(FROM)}`],
    ['project_card', 'pc1', '/strata/execution/real-project-1'],
    ['decision', 'd1', '/strata/reviews/SNAP-1001'],
    ['action', 'a1', '/strata/reviews/SNAP-1001'],
    ['upload_run', 'run1', '/strata/data/runs/RUN-1001'],
    ['element', 'el1', '/strata/strategy/elements/grow-market-share'],
  ])('%s → exact owning record route', (entityType, entityId, expected) => {
    expect(attentionRoute(entityType, entityId, lookups, FROM)).toBe(expected);
  });

  it.each([
    ['kpi', '/strata/kpis'],
    ['benefit', '/strata/portfolio'],
    ['portfolio', '/strata/portfolio'],
    ['project_card', '/strata/execution'],
    ['decision', '/strata/reviews'],
    ['action', '/strata/reviews'],
    ['upload_run', '/strata/data'],
    ['element', '/strata/strategy'],
  ])('unresolvable %s falls back to its owning list surface (never a dead row)', (entityType, expected) => {
    expect(attentionRoute(entityType, 'unknown-id', lookups)).toBe(expected);
  });

  it('unknown entity types return null (rendered non-actionable, zero-assumption)', () => {
    expect(attentionRoute('martian', 'x', lookups)).toBeNull();
  });
});
