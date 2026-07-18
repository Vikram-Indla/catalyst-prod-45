/**
 * Command Center derivation logic — CAT-STRATA-CCDEF-20260718-001 (Module 8 defect pack).
 *
 * Pure functions extracted from StrataCommandCenterPage so every headline,
 * trend point, narrative clause, dedup decision and drill route is unit-testable
 * against cross-cycle fixtures:
 *
 *   CC-DEF-005 — scopeOpenDecisions: cycle/period scoping with an explicit,
 *                visible Global bucket (never silently included in scoped totals).
 *   CC-DEF-002 — officialTrendSeries: exactly ONE official score per period
 *                (approval state wins: locked > live > pending_validation > draft),
 *                revision count preserved; computeScoreDelta derives from the
 *                same official series.
 *   CC-DEF-001 — selectDragPerspective: a perspective "drags" only when it is
 *                strictly below the server-calculated enterprise score.
 *   CC-DEF-004 — dedupeAttentionRows: stable identity key, identical engine
 *                rows reconcile to one visible row; total === displayed rows.
 *   CC-DEF-003 — attentionRoute: every alert type resolves to its exact owning
 *                record (slug/display-key route), with an honest list-level
 *                fallback when the record cannot be resolved client-side.
 */
import { Routes } from '@/lib/routes';

// ── CC-DEF-002: official trend identity ──────────────────────────────────────

export interface RawTrendPoint {
  instanceId: string;
  periodId: string | null;
  score: number;
  statusKey: string | null;
  slug: string | null;
}

export interface TrendInstanceLite {
  id: string;
  period_id: string | null;
  status: string; // DataState: 'live' | 'draft' | 'pending_validation' | 'locked'
}

export interface TrendPeriodLite {
  id: string;
  name: string;
  starts_on: string;
}

export interface OfficialTrendPoint {
  label: string;
  score: number;
  statusKey: string | null;
  slug: string | null;
  instanceId: string;
  periodId: string | null;
  /** How many candidate instance scores existed for this period (1 = no revisions). */
  revisions: number;
  /** Approval state of the winning instance — 'locked' is the official/approved series. */
  officialState: string;
}

/** Higher wins: an approved (locked) score IS the official score for its period. */
const OFFICIAL_RANK: Record<string, number> = {
  locked: 3,
  live: 2,
  pending_validation: 1,
  draft: 0,
};

/**
 * Collapse raw per-instance trend points to ONE official point per period.
 * Deterministic: rank by approval state, then instanceId (stable tie-break).
 * Points with no period cannot be merged and are kept as-is (labelled '—').
 */
export function officialTrendSeries(
  raw: RawTrendPoint[],
  instances: TrendInstanceLite[],
  periods: TrendPeriodLite[],
): OfficialTrendPoint[] {
  const instById = new Map(instances.map((i) => [i.id, i]));
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const byPeriod = new Map<string, RawTrendPoint[]>();
  for (const pt of raw) {
    const key = pt.periodId ?? `__unperioded__:${pt.instanceId}`;
    const bucket = byPeriod.get(key);
    if (bucket) bucket.push(pt);
    else byPeriod.set(key, [pt]);
  }
  const out: Array<OfficialTrendPoint & { startsOn: string }> = [];
  for (const pts of byPeriod.values()) {
    const rank = (p: RawTrendPoint) => OFFICIAL_RANK[instById.get(p.instanceId)?.status ?? ''] ?? -1;
    const winner = [...pts].sort((a, b) => rank(b) - rank(a) || a.instanceId.localeCompare(b.instanceId))[0];
    const period = winner.periodId ? periodById.get(winner.periodId) : undefined;
    out.push({
      label: period?.name ?? '—',
      startsOn: period?.starts_on ?? '',
      score: winner.score,
      statusKey: winner.statusKey,
      slug: winner.slug,
      instanceId: winner.instanceId,
      periodId: winner.periodId,
      revisions: pts.length,
      officialState: instById.get(winner.instanceId)?.status ?? 'unknown',
    });
  }
  return out
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0))
    .map(({ startsOn: _s, ...rest }) => rest);
}

/** Δ vs the prior period, derived from the SAME official series the chart renders. */
export function computeScoreDelta(
  points: OfficialTrendPoint[],
  activePeriodName: string | null,
): { delta: number; priorLabel: string } | null {
  if (points.length < 2) return null;
  const curIdx = activePeriodName ? points.findIndex((p) => p.label === activePeriodName) : points.length - 1;
  const cur = curIdx >= 0 ? points[curIdx] : points[points.length - 1];
  const prior = curIdx > 0 ? points[curIdx - 1] : null;
  if (!cur || !prior) return null;
  return { delta: cur.score - prior.score, priorLabel: prior.label };
}

// ── CC-DEF-001: truthful narrative derivation ────────────────────────────────

export interface PerspectiveLite {
  perspective_id: string;
  name: string;
  score: number;
  has_data: boolean;
}

const DRAG_EPS = 0.005;

/**
 * The perspective that genuinely DRAGS the enterprise score — i.e. sits strictly
 * below the server-calculated weighted enterprise score. When every perspective
 * equals the enterprise score (e.g. all 100 / On track) nothing drags: return null
 * so the narrative renders its truthful no-drag state instead.
 */
export function selectDragPerspective(
  calc: { has_data: boolean; score: number; perspectives: PerspectiveLite[] } | null,
): PerspectiveLite | null {
  if (!calc || !calc.has_data) return null;
  const scored = calc.perspectives.filter((p) => p.has_data && p.score != null);
  if (scored.length === 0) return null;
  const worst = scored.reduce((lo, p) => (p.score < lo.score ? p : lo));
  if (worst.score >= calc.score - DRAG_EPS) return null; // nothing is below the enterprise score
  return worst;
}

// ── CC-DEF-004: stable-key deduplication ─────────────────────────────────────

export interface RawAttentionItem {
  item_type: string;
  severity: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  detail: string;
  due_date: string | null;
  owner_id: string | null;
}

export interface DedupedAttentionItem extends RawAttentionItem {
  /** Stable identity — NO positional index. Unique across the deduped set. */
  key: string;
  /** How many identical engine rows reconciled into this one (1 = no duplicates). */
  duplicates: number;
}

/** Identity = every field the row displays. Rows differing in ANY visible detail stay distinct. */
export function attentionRowKey(r: RawAttentionItem): string {
  return [r.item_type, r.entity_type, r.entity_id, r.severity, r.detail ?? '', r.due_date ?? '', r.owner_id ?? ''].join('|');
}

/** Identical rows collapse to one; the visible total equals the deduped length. */
export function dedupeAttentionRows(raw: RawAttentionItem[]): DedupedAttentionItem[] {
  const byKey = new Map<string, DedupedAttentionItem>();
  for (const r of raw) {
    const key = attentionRowKey(r);
    const existing = byKey.get(key);
    if (existing) existing.duplicates += 1;
    else byKey.set(key, { ...r, key, duplicates: 1 });
  }
  return [...byKey.values()];
}

// ── CC-DEF-005: cycle/period context integrity ───────────────────────────────

export interface DecisionLite {
  id: string;
  status: string;
  snapshot_id: string | null;
  element_id: string | null;
}

export interface SnapshotCycleLite {
  id: string;
  cycle_id: string | null;
}

export interface OpenDecisionScope {
  /** Open decisions provably in the active cycle (via snapshot or cycle element). */
  scoped: number;
  /** Open decisions with NO cycle linkage at all — deliberate globals, shown labelled, never in scoped totals. */
  global: number;
  /** Open decisions linked to a DIFFERENT cycle — excluded entirely from this view. */
  otherCycle: number;
}

/**
 * Scope open decisions to the active cycle. A decision counts as scoped only with
 * positive evidence (its snapshot's cycle_id matches, or its element belongs to the
 * active cycle's element set). Unlinked decisions are Global — surfaced separately,
 * never silently added to the scoped headline. Decisions provably in another cycle
 * are excluded (negative control: Cycle 4 must not count 2026 decisions).
 */
export function scopeOpenDecisions(
  decisions: DecisionLite[],
  snapshots: SnapshotCycleLite[],
  activeCycleElementIds: ReadonlySet<string>,
  activeCycleId: string | null,
): OpenDecisionScope {
  const snapCycle = new Map(snapshots.map((s) => [s.id, s.cycle_id]));
  let scoped = 0; let global = 0; let otherCycle = 0;
  for (const d of decisions) {
    if (d.status !== 'open') continue;
    if (d.snapshot_id != null && snapCycle.has(d.snapshot_id)) {
      if (activeCycleId != null && snapCycle.get(d.snapshot_id) === activeCycleId) scoped += 1;
      else otherCycle += 1;
    } else if (d.element_id != null) {
      // Element set is already cycle-scoped; membership is positive evidence.
      if (activeCycleElementIds.has(d.element_id)) scoped += 1;
      else otherCycle += 1;
    } else {
      global += 1;
    }
  }
  return { scoped, global, otherCycle };
}

/** AI advisories scoped via snapshot linkage: keep active-cycle + unlinked (labelled live/global). */
export function scopeAiOutputs<T extends { snapshot_id: string | null }>(
  outputs: T[],
  snapshots: SnapshotCycleLite[],
  activeCycleId: string | null,
): Array<T & { scopeLabel: 'cycle' | 'global' }> {
  const snapCycle = new Map(snapshots.map((s) => [s.id, s.cycle_id]));
  const out: Array<T & { scopeLabel: 'cycle' | 'global' }> = [];
  for (const o of outputs) {
    if (o.snapshot_id != null && snapCycle.has(o.snapshot_id)) {
      if (activeCycleId != null && snapCycle.get(o.snapshot_id) === activeCycleId) {
        out.push({ ...o, scopeLabel: 'cycle' });
      }
      // other cycle → excluded from this view entirely
    } else {
      out.push({ ...o, scopeLabel: 'global' });
    }
  }
  return out;
}

// ── CC-DEF-003: exact-record drill routes ────────────────────────────────────

export interface AttentionRouteLookups {
  kpiSlug: (id: string) => string | null | undefined;
  benefitSlug: (id: string) => string | null | undefined;
  portfolioSlug: (id: string) => string | null | undefined;
  projectCardSlug: (id: string) => string | null | undefined;
  elementSlug: (id: string) => string | null | undefined;
  runKey: (id: string) => string | null | undefined;
  /** decision id → owning snapshot display key (via decision.snapshot_id). */
  decisionSnapshotKey: (id: string) => string | null | undefined;
  /** action id → owning decision's snapshot display key (action → decision → snapshot). */
  actionSnapshotKey: (id: string) => string | null | undefined;
}

/**
 * Resolve an attention row to the route of its EXACT owning record.
 * Falls back to the owning list surface only when the record cannot be
 * resolved client-side (honest degradation, never a dead row).
 */
export function attentionRoute(
  entityType: string,
  entityId: string,
  lk: AttentionRouteLookups,
  from?: string,
): string | null {
  switch (entityType) {
    case 'kpi': {
      const slug = lk.kpiSlug(entityId);
      return slug ? Routes.strata.kpi(slug) : Routes.strata.kpis();
    }
    case 'benefit': {
      const slug = lk.benefitSlug(entityId);
      return slug ? Routes.strata.benefit(slug) : Routes.strata.portfolio();
    }
    case 'portfolio': {
      const slug = lk.portfolioSlug(entityId);
      return slug ? Routes.strata.portfolioDetail(slug, from) : Routes.strata.portfolio();
    }
    case 'initiative':
      return Routes.strata.execution();
    case 'project_card': {
      const slug = lk.projectCardSlug(entityId);
      return slug ? Routes.strata.projectCard(slug) : Routes.strata.execution();
    }
    case 'decision': {
      const key = lk.decisionSnapshotKey(entityId);
      return key ? Routes.strata.review(key) : Routes.strata.reviews();
    }
    case 'action': {
      const key = lk.actionSnapshotKey(entityId);
      return key ? Routes.strata.review(key) : Routes.strata.reviews();
    }
    case 'upload_run': {
      const key = lk.runKey(entityId);
      return key ? Routes.strata.run(key) : Routes.strata.data();
    }
    case 'element': {
      const slug = lk.elementSlug(entityId);
      return slug ? Routes.strata.strategyElement(slug) : Routes.strata.strategy();
    }
    default:
      return null;
  }
}
