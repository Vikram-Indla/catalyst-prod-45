/**
 * STRATA Executive Command Center (route /strata) — CAT-STRATA-20260705-001.
 *
 * Executive workbench: every panel supports a decision, explains a metric,
 * shows a trend, or navigates to evidence — decorative panels banned.
 *
 * Layout (12-col grid):
 *   Row 1 — executive stat strip (evidence-route navigation on score/VaR).
 *   Row 2 — Enterprise score trend (8) + Perspective health (4).
 *   Row 3 — Needs attention: ONE actionable inbox (JiraTable) fed by the
 *           server-side rule engine (strata_needs_attention): attestations,
 *           benefit validations, blockers, overdue actions/gates, broken
 *           assumptions, missing actuals, upload rejections, governance drift.
 *
 * Every score/band/rollup on this page is server-calculated (strata_calc_*
 * RPCs or frozen snapshot payloads) — the UI only renders and counts rows.
 * ADS tokens only. No silent failures: every failing query surfaces.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { Button, CatalystTag, EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { LABEL } from '@/components/project-hub/dashboard/dashboardTypography';
import { Routes } from '@/lib/routes';
import { AlertTriangle, History, PieChart, Sparkles, TrendingUp } from '@/lib/atlaskit-icons';
import { governanceApi } from '@/modules/strata/domain';
import {
  useStrataContext,
  useScorecardInstances,
  useScorecardCalc,
  usePortfolios,
  useValueAtRisk,
  useBenefits,
  useDecisions,
  useKpis,
  useNeedsAttention,
  useSnapshots,
  useSnapshotItems,
  useDataSources,
  useUploadRuns,
  useStrataUserId,
  useEnterpriseScoreTrend,
  useAiOutputs,
  useStrataRoles,
  useBandResolver,
  useInvalidateStrata,
  useProjectCards,
  useActions,
  useStrategyElements,
  useElementKpis,
  useInitiatives,
} from '@/modules/strata/hooks/useStrata';
import {
  attentionRoute,
  computeScoreDelta,
  dedupeAttentionRows,
  officialTrendSeries,
  partitionAttentionRows,
  scopeAiOutputs,
  scopeOpenDecisions,
  selectDragPerspective,
} from '@/modules/strata/pages/commandCenterLogic';
import type { OfficialTrendPoint } from '@/modules/strata/pages/commandCenterLogic';
import {
  T,
  StrataPageShell,
  StrataSnapshotBand,
  StrataPanel,
  StrataScoreRing,
  StrataBandBar,
  StrataBandLozenge,
  useBandTone,
} from '@/modules/strata/components/shared';
import {
  fmtDate, fmtDateTime, fmtPct, fmtRatioPct, fmtSarCompact, fmtScore, labelize,
} from '@/modules/strata/components/format';
import type { ScorecardCalcResult, StrataAiOutput } from '@/modules/strata/types';

/** Display-only: server score → text, dash when engine reports no data. */
function scoreText(score: number | null | undefined, hasData: boolean | undefined): string {
  if (hasData === false || score == null) return '—';
  return fmtScore(score);
}

/** Past-due check for governance due dates (display flag only). */
function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

/** Whole days a due date is past — 0 = due earlier today. */
function daysOverdue(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function ClickableRow({ onClick, children, testId }: { onClick?: () => void; children: React.ReactNode; testId?: string }) {
  const clickable = !!onClick;
  const [hover, setHover] = useState(false);
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
        margin: '0 -8px', borderRadius: 4,
        borderBottom: `1px solid ${T.border}`,
        cursor: clickable ? 'pointer' : 'default', minWidth: 0,
        background: clickable && hover ? T.sunken : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

/** Layout-matched loading skeleton: stat strip + trend/health row + inbox. */
function LoadingSkeleton() {
  return (
    <div aria-hidden data-testid="strata-cc-loading" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 16 }}>
      <div style={{ gridColumn: 'span 12', height: 92, borderRadius: 8, background: T.neutral }} />
      <div style={{ gridColumn: 'span 8', height: 280, borderRadius: 8, background: T.neutral }} />
      <div style={{ gridColumn: 'span 4', height: 280, borderRadius: 8, background: T.neutral }} />
      <div style={{ gridColumn: 'span 12', height: 240, borderRadius: 8, background: T.neutral }} />
    </div>
  );
}

/** Per-panel error degradation — one failing query never blanks the page. */
function PanelError({ error }: { error: unknown }) {
  return (
    <SectionMessage appearance="error" title="Could not load this panel">
      <p>{(error as Error)?.message ?? 'Unknown error.'}</p>
    </SectionMessage>
  );
}

/** Inline text link used inside the judgment-band sentence — token-pure, keyboard
 *  accessible (real button), navigates on click. Inherits the sentence's font. */
function InlineLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit',
        color: 'var(--ds-link)', cursor: 'pointer', textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  );
}

// ── Enterprise score trend ────────────────────────────────────────────────────
// CC-DEF-002: the chart consumes the OFFICIAL series — one point per period,
// approval state (locked) wins over live; revision state travels with the point.
type TrendChartPoint = OfficialTrendPoint;

/** Human-readable revision/approval qualifier for a trend point (empty when unambiguous). */
function trendRevisionNote(p: TrendChartPoint): string | null {
  if (p.revisions <= 1) return null;
  return `official ${p.officialState === 'locked' ? 'locked' : p.officialState} score · ${p.revisions - 1} superseded ${p.revisions - 1 === 1 ? 'revision' : 'revisions'} hidden`;
}

/** Band-toned dot; focusable link with an accessible name (§14) — keyboard
 *  activatable when a scorecard slug exists, else a labelled non-interactive point. */
function TrendDot(props: {
  cx?: number; cy?: number; payload?: TrendChartPoint;
  tone: (bandKey?: string | null) => string;
  bandLabelFor: (bandKey?: string | null) => string | null;
  onPointClick: (p: TrendChartPoint) => void;
}) {
  const { cx, cy, payload, tone, bandLabelFor, onPointClick } = props;
  if (cx == null || cy == null || !payload) return null;
  const clickable = !!payload.slug;
  const bandLabel = bandLabelFor(payload.statusKey);
  // "Q1 2026, 73.5, Needs attention — view evidence" (§14 accessible-name shape).
  const accessibleName =
    [payload.label, fmtScore(payload.score), bandLabel, trendRevisionNote(payload)].filter(Boolean).join(', ')
    + (clickable ? ' — view evidence' : '');
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={tone(payload.statusKey)}
      stroke={T.raised}
      strokeWidth={1.5}
      role={clickable ? 'link' : 'img'}
      aria-label={accessibleName}
      tabIndex={clickable ? 0 : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default', outlineOffset: 2 }}
      onClick={clickable ? () => onPointClick(payload) : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPointClick(payload); } } : undefined}
      data-testid={`strata-cc-trend-dot-${payload.label}`}
    />
  );
}

/** Score delta with direction glyph + word (color never alone, §14). */
function DeltaText({ delta }: { delta: number }) {
  const up = delta > 0.005;
  const down = delta < -0.005;
  return (
    <span style={{
      color: up ? 'var(--ds-text-success)' : down ? 'var(--ds-text-danger)' : T.subtlest,
      fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    }}>
      {up || down ? `${up ? '▲' : '▼'} ${fmtScore(Math.abs(delta))}` : 'No change'}
    </span>
  );
}

function TrendTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: TrendChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: 'var(--ds-surface-overlay)', border: `1px solid ${T.border}`,
      borderRadius: 6, boxShadow: 'var(--ds-shadow-overlay)', padding: '8px 12px',
    }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{p.label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {fmtScore(p.score)}
        </span>
        <StrataBandLozenge bandKey={p.statusKey} />
      </div>
      {trendRevisionNote(p) ? (
        <div style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, marginTop: 4 }}>
          {trendRevisionNote(p)}
        </div>
      ) : null}
      {p.slug ? (
        <div style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, marginTop: 4 }}>Click point for evidence</div>
      ) : null}
    </div>
  );
}

// ── Needs attention inbox (server-side rule engine — strata_needs_attention) ─
interface AttentionRow {
  id: string;
  /** Rule key from the engine (pending_attestation, blocked_dependency, …). */
  itemType: string;
  severity: string;
  /** Resolved entity name — never a raw UUID; dash when unknown. */
  entityName: string | null;
  detail: string;
  /** Due date ISO — rendered danger when overdue. */
  due: string | null;
  /** Owner of the item (null where no single personal owner) — drives the "Mine" filter. */
  ownerId: string | null;
  /** CC-DEF-003: full accessible name — type, item, detail, due state, destination. */
  ariaLabel: string;
  nav?: () => void;
}

/** Severity → lozenge appearance (existing conventions: danger-ish = removed). */
const SEVERITY_LOZENGE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  critical: 'removed',
  warning: 'moved',
};

/** Short lozenge labels per rule key — the raw keys labelize into strings too
 *  long for a lozenge in a 16% column ("PENDING BENEFIT VALIDATION" clipped).
 *  Unknown keys fall back to labelize (zero-assumption; nothing invented). */
const ATTENTION_TYPE_LABEL: Record<string, string> = {
  pending_attestation: 'Attestation',
  pending_benefit_validation: 'Benefit validation',
  blocked_dependency: 'Blocked dependency',
  overdue_action: 'Overdue action',
  overdue_gate: 'Overdue gate',
  broken_assumption: 'Assumption broken',
  missing_actual: 'Missing actual',
  upload_rejections: 'Upload rejections',
  project_major_delay: 'Project major delay',
  project_health_unavailable: 'Health unavailable',
  project_blocked_dependency: 'Project blocked',
};

// ── AI advisory (F-GOV-009: draft → human review; reviewer ≠ author is DB-enforced) ─
/** UI affordance gating only — the edge function / DB enforce the real rules.
 *  executive_viewer is read-only ("no data edits") — advisory generate/review are writes; W2 20260710140000. */
const ADVISORY_ROLES: readonly string[] = ['strategy_office', 'vmo_validator', 'strata_admin'];

const ADVISORY_REVIEW_LOZENGE: Record<StrataAiOutput['human_review_status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  pending: 'moved',
  approved: 'success',
  rejected: 'removed',
};

/** Confidence arrives as ratio (0–1) or percent — format by scale (same convention as evidence). */
const fmtAdvisoryConfidence = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return v <= 1 ? fmtRatioPct(v) : fmtPct(v);
};

export default function StrataCommandCenterPage() {
  const navigate = useNavigate();
  const { activeCycle, activePeriod, periods, isLoading: ctxLoading } = useStrataContext();
  const bandTone = useBandTone();
  const resolveBand = useBandResolver();
  const bandLabelFor = (bandKey?: string | null): string | null => resolveBand(bandKey)?.label ?? null;

  // ── Scorecard: the instance for the active period, server-calculated ──────
  const instancesQ = useScorecardInstances(activeCycle?.id);
  const instance = useMemo(
    () => (instancesQ.data ?? []).find((i) => activePeriod && i.period_id === activePeriod.id) ?? null,
    [instancesQ.data, activePeriod],
  );
  const calcQ = useScorecardCalc(instance);

  // ── CC-DEF-001 closure-proof fixture (DEV-only, non-production) ───────────
  // /strata?ccFixture=all100 | ?ccFixture=degraded feeds a deterministic
  // synthetic calc through the REAL rendering + derivation path (judgment band,
  // selectDragPerspective, perspective health). Never active in production
  // builds; reads no live records and writes nothing. A visible banner labels it.
  const [searchParams] = useSearchParams();
  const fixtureKey = import.meta.env.DEV ? searchParams.get('ccFixture') : null;
  const fixtureCalc = useMemo((): ScorecardCalcResult | null => {
    if (!fixtureKey) return null;
    const persp = (id: string, name: string, score: number) => ({
      perspective_id: `fixture-${id}`, name, weight: 25, score, has_data: true,
      status_key: score >= 85 ? 'on_track' : 'off_track',
    });
    const base = {
      instance_id: 'fixture-instance', period_id: activePeriod?.id ?? null,
      rollup_method: 'weighted_average', model_id: 'fixture-model', model_version: 1,
      lines: [], calculated_at: '2026-07-18T00:00:00Z', has_data: true,
    };
    if (fixtureKey === 'all100') {
      return {
        ...base, score: 100, status_key: 'on_track',
        perspectives: [persp('fin', 'Financial', 100), persp('cus', 'Customer', 100), persp('int', 'Internal Process', 100), persp('lrn', 'Learning & Growth', 100)],
      };
    }
    if (fixtureKey === 'degraded') {
      // Weighted mean (60+100+100+100)/4 = 90 — Financial strictly below it.
      return {
        ...base, score: 90, status_key: 'on_track',
        perspectives: [persp('fin', 'Financial', 60), persp('cus', 'Customer', 100), persp('int', 'Internal Process', 100), persp('lrn', 'Learning & Growth', 100)],
      };
    }
    return null;
  }, [fixtureKey, activePeriod]);
  const calc: ScorecardCalcResult | null = fixtureCalc ?? calcQ.data ?? null;

  // ── Enterprise score trend (server-calculated history only) ───────────────
  const trendQ = useEnterpriseScoreTrend(activeCycle?.id);

  // ── Value at risk (first portfolio) ────────────────────────────────────────
  const portfoliosQ = usePortfolios();
  const portfolio = portfoliosQ.data?.[0] ?? null;
  const varQ = useValueAtRisk(portfolio?.id);

  // ── Benefits (entity-name resolution for the attention inbox) ──────────────
  const benefitsQ = useBenefits();

  // ── Governance / execution counts ──────────────────────────────────────────
  const decisionsQ = useDecisions();
  const kpisQ = useKpis();
  // CC-DEF-003: entity lookups so every attention row drills to its EXACT owning record.
  const projectCardsQ = useProjectCards();
  const actionsQ = useActions();
  // CC-DEF-005: active-cycle element set — positive-evidence scoping for theme decisions.
  const elementsQ = useStrategyElements(activeCycle?.id);
  // CC-DEF-005 (Cycle 4): explicit relationship tables for the attention feed.
  const elementKpisQ = useElementKpis();
  const initiativesQ = useInitiatives();
  // Server-side rule engine feed — replaces the former client-composed inbox.
  const needsAttentionQ = useNeedsAttention(activePeriod?.id);
  // Locked-mode snapshot basis (resolves instance.locked_snapshot_id → snapshot).
  const snapshotsQ = useSnapshots();
  // Data-trust inputs (sources + latest completed run + pending validations).
  const dataSourcesQ = useDataSources();
  const uploadRunsQ = useUploadRuns();

  // ── AI advisory (generate + human review) ──────────────────────────────────
  const aiOutputsQ = useAiOutputs();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const canAdvise = (rolesQ.data ?? []).some((r) => ADVISORY_ROLES.includes(r));
  // Role-aware restricted state (§17): a viewer with no STRATA role sees strategy
  // data denied by RLS — explain it, never blank/generic. Presentation only; the DB
  // is the real gate. executive_viewer etc. hold >=1 role and are NOT restricted.
  const noStrataRole = !rolesQ.isLoading && (rolesQ.data ?? []).length === 0;
  /** 'generate' or the advisory id under review — one action at a time. */
  const [advisoryBusy, setAdvisoryBusy] = useState<string | null>(null);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);

  /** Runs an advisory RPC; server rejection text (e.g. reviewer == author) surfaces verbatim. */
  const runAdvisoryAction = async (key: string, fn: () => Promise<unknown>) => {
    setAdvisoryBusy(key);
    setAdvisoryError(null);
    try {
      await fn();
    } catch (e) {
      setAdvisoryError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdvisoryBusy(null);
      invalidate();
    }
  };

  // CC-DEF-005: open decisions scoped to the active cycle; unlinked ones are a
  // visible Global bucket, never silently added to the scoped headline count.
  const decisionScope = useMemo(
    () => scopeOpenDecisions(
      decisionsQ.data ?? [],
      snapshotsQ.data ?? [],
      new Set((elementsQ.data ?? []).map((e) => e.id)),
      activeCycle?.id ?? null,
    ),
    [decisionsQ.data, snapshotsQ.data, elementsQ.data, activeCycle],
  );
  // CC-DEF-005: advisories from another cycle's snapshot are excluded; unlinked
  // (live-data) advisories are kept but visibly labelled Global.
  const scopedAdvisories = useMemo(
    () => scopeAiOutputs(aiOutputsQ.data ?? [], snapshotsQ.data ?? [], activeCycle?.id ?? null),
    [aiOutputsQ.data, snapshotsQ.data, activeCycle],
  );
  const kpiById = useMemo(
    () => new Map((kpisQ.data ?? []).map((k) => [k.id, k])),
    [kpisQ.data],
  );
  const benefitById = useMemo(
    () => new Map((benefitsQ.data ?? []).map((b) => [b.id, b])),
    [benefitsQ.data],
  );

  // ── Trend points: ONE official score per period (CC-DEF-002) ──────────────
  // Approval state wins (locked > live > pending_validation > draft); superseded
  // revisions are counted and disclosed on the point, never plotted as duplicates.
  const trendPoints: TrendChartPoint[] = useMemo(
    () => officialTrendSeries(trendQ.data ?? [], instancesQ.data ?? [], periods),
    [trendQ.data, instancesQ.data, periods],
  );

  const openTrendEvidence = (p: TrendChartPoint) => {
    if (p.slug) navigate(Routes.strata.scorecardEvidence(p.slug, Routes.strata.root()));
  };

  // ── Needs attention rows (server rule engine → drill to owning record) ────
  // CC-DEF-004: identical engine rows reconcile to ONE row under a stable
  // identity key (no positional index); the panel total equals the visible rows.
  // CC-DEF-005 (Cycle 4): rows are partitioned by explicit relationship — only
  // active-cycle rows count; cycle-less rows render in a separate Global section;
  // other-cycle rows are excluded.
  // CC-DEF-003: each row resolves to its EXACT owning record's route.
  const attentionPartition = useMemo(() => {
    const portfolioById = new Map((portfoliosQ.data ?? []).map((p) => [p.id, p]));
    const projectCardById = new Map((projectCardsQ.data ?? []).map((c) => [c.id, c]));
    const elementById = new Map((elementsQ.data ?? []).map((e) => [e.id, e]));
    const runById = new Map((uploadRunsQ.data ?? []).map((r) => [r.id, r]));
    const decisionById = new Map((decisionsQ.data ?? []).map((d) => [d.id, d]));
    const actionById = new Map((actionsQ.data ?? []).map((a) => [a.id, a]));
    const snapshotById = new Map((snapshotsQ.data ?? []).map((s) => [s.id, s]));
    const snapshotKeyForDecision = (decisionId: string): string | null => {
      const d = decisionById.get(decisionId);
      return d?.snapshot_id ? snapshotById.get(d.snapshot_id)?.snapshot_key ?? null : null;
    };
    const lookups = {
      kpiSlug: (id: string) => kpiById.get(id)?.slug,
      benefitSlug: (id: string) => benefitById.get(id)?.slug,
      portfolioSlug: (id: string) => portfolioById.get(id)?.slug,
      projectCardSlug: (id: string) => projectCardById.get(id)?.slug,
      elementSlug: (id: string) => elementById.get(id)?.slug,
      runKey: (id: string) => runById.get(id)?.run_key,
      decisionSnapshotKey: snapshotKeyForDecision,
      actionSnapshotKey: (id: string) => {
        const a = actionById.get(id);
        return a?.decision_id ? snapshotKeyForDecision(a.decision_id) : null;
      },
    };
    // Explicit, auditable relationships driving cycle admission (CC-DEF-005).
    const rel = {
      activeCycleId: activeCycle?.id ?? null,
      activeCycleElementIds: new Set((elementsQ.data ?? []).map((e) => e.id)),
      kpiElementIds: (() => {
        const m = new Map<string, string[]>();
        for (const l of elementKpisQ.data ?? []) {
          const arr = m.get(l.kpi_id) ?? [];
          arr.push(l.element_id);
          m.set(l.kpi_id, arr);
        }
        return m;
      })(),
      projectCardElementIds: new Map((projectCardsQ.data ?? []).map((c) => [
        c.id, [c.theme_id, c.objective_element_id].filter((x): x is string => x != null),
      ])),
      initiativeCycleId: new Map((initiativesQ.data ?? []).map((i) => [i.id, i.cycle_id])),
      decisionById: new Map((decisionsQ.data ?? []).map((d) => [d.id, d])),
      actionDecisionId: new Map((actionsQ.data ?? []).map((a) => [a.id, a.decision_id])),
      snapshotCycleId: new Map((snapshotsQ.data ?? []).map((s) => [s.id, s.cycle_id])),
    };
    const toRow = (r: ReturnType<typeof dedupeAttentionRows>[number]): AttentionRow => {
      const path = attentionRoute(r.entity_type, r.entity_id, lookups, Routes.strata.root());
      const typeLabel = ATTENTION_TYPE_LABEL[r.item_type] ?? labelize(r.item_type);
      // CC-DEF-003: accessible name — type, item, detail, due state, destination.
      const ariaLabel = [
        typeLabel,
        r.entity_name ?? 'unnamed item',
        r.detail,
        r.due_date ? (isOverdue(r.due_date) ? `overdue since ${fmtDate(r.due_date)}` : `due ${fmtDate(r.due_date)}`) : 'no due date',
        path ? `press Enter to open ${path}` : 'no destination available',
      ].join(', ');
      return {
        id: r.key,
        itemType: r.item_type,
        severity: r.severity,
        entityName: r.entity_name,
        detail: r.detail,
        due: r.due_date,
        ownerId: r.owner_id,
        ariaLabel,
        nav: path ? () => navigate(path) : undefined,
      };
    };
    const parts = partitionAttentionRows(dedupeAttentionRows(needsAttentionQ.data ?? []), rel);
    return {
      scoped: parts.scoped.map(toRow),
      global: parts.global.map(toRow),
      excludedCount: parts.excluded.length,
    };
  }, [
    needsAttentionQ.data, kpiById, benefitById, portfoliosQ.data, projectCardsQ.data,
    elementsQ.data, elementKpisQ.data, initiativesQ.data, uploadRunsQ.data,
    decisionsQ.data, actionsQ.data, snapshotsQ.data, activeCycle, navigate,
  ]);
  const attentionRows = attentionPartition.scoped;
  const globalAttentionRows = attentionPartition.global;

  // ── "Mine" filter (CLOSEOUT W4): narrow the org-wide feed to items I must act on ──
  const myUserId = useStrataUserId().data ?? null;
  const [attentionScope, setAttentionScope] = useState<'all' | 'mine'>('all');
  const mineCount = useMemo(
    () => (myUserId ? attentionRows.filter((r) => r.ownerId === myUserId).length : 0),
    [attentionRows, myUserId],
  );
  const visibleAttentionRows = useMemo(
    () => (attentionScope === 'mine' && myUserId ? attentionRows.filter((r) => r.ownerId === myUserId) : attentionRows),
    [attentionRows, attentionScope, myUserId],
  );

  // No silent failures: surface the failing inbox source.
  const attentionError = needsAttentionQ.error;

  const attentionColumns: Column<AttentionRow>[] = useMemo(() => [
    {
      id: 'type', label: 'Type', width: 16,
      cell: ({ row }) => (
        <Lozenge appearance={SEVERITY_LOZENGE[row.severity] ?? 'default'}>
          {ATTENTION_TYPE_LABEL[row.itemType] ?? labelize(row.itemType)}
        </Lozenge>
      ),
    },
    {
      id: 'entity', label: 'Item', width: 20,
      cell: ({ row }) => (
        <span style={{
          fontSize: 'var(--ds-font-size-200)', color: T.text, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.entityName ?? '—'}
        </span>
      ),
    },
    {
      id: 'detail', label: 'Detail', flex: true,
      cell: ({ row }) => (
        <span style={{
          fontSize: 'var(--ds-font-size-100)', color: T.subtle, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.detail}
        </span>
      ),
    },
    {
      id: 'due', label: 'Due', width: 12,
      cell: ({ row }) => {
        if (!row.due) return <span style={{ color: T.subtlest }}>—</span>;
        if (isOverdue(row.due)) {
          const n = daysOverdue(row.due);
          return (
            <span style={{
              fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)',
              fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
            }}>
              {n === 0 ? 'Due today' : `${n} ${n === 1 ? 'day' : 'days'} overdue`}
            </span>
          );
        }
        return (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
            {fmtDate(row.due)}
          </span>
        );
      },
    },
  ], []);

  // ── Page states ─────────────────────────────────────────────────────────────
  const isLoading = ctxLoading || instancesQ.isLoading || (!!instance && calcQ.isLoading);
  const dataState = instance ? (instance.status === 'locked' ? 'locked' : 'live') : null;
  // Resolve the locked snapshot behind a locked instance (chrome-level band basis).
  const lockedSnapshot = useMemo(
    () => (snapshotsQ.data ?? []).find((s) => s.id === instance?.locked_snapshot_id) ?? null,
    [snapshotsQ.data, instance],
  );

  // ── Changes since the last locked review (D-3: client diff, no RPC) ─────────
  // Reference = most-recent LOCKED snapshot in the active cycle that is NOT the one
  // currently being viewed. Live mode → the last executive review; locked mode →
  // the review before this one (compare-to-self is meaningless → zero-assumption empty).
  const refSnapshot = useMemo(
    () => (snapshotsQ.data ?? []).find(
      (s) => s.status === 'locked' && s.cycle_id === activeCycle?.id && s.id !== instance?.locked_snapshot_id,
    ) ?? null,
    [snapshotsQ.data, activeCycle, instance],
  );
  const refItemsQ = useSnapshotItems(refSnapshot?.id);
  /** Frozen enterprise score + per-perspective deltas vs the live calc. Null when
   *  there is no comparable prior review (no snapshot, no frozen instance, no live data). */
  const changesDiff = useMemo(() => {
    if (!refSnapshot || !calc || !calc.has_data) return null;
    const instItem = (refItemsQ.data as Array<{ entity_type: string; payload: Record<string, unknown> }> | undefined)
      ?.find((i) => i.entity_type === 'scorecard_instance');
    if (!instItem) return null;
    const p = instItem.payload as {
      value?: number | string | null;
      inputs?: { perspectives?: Array<{ perspective_id: string; score: number; has_data?: boolean }> };
    };
    const frozenScore = p.value != null ? Number(p.value) : null;
    if (frozenScore == null || Number.isNaN(frozenScore)) return null;
    const frozenById = new Map((p.inputs?.perspectives ?? []).map((fp) => [fp.perspective_id, fp]));
    const rows = calc.perspectives
      .filter((cp) => cp.has_data && frozenById.has(cp.perspective_id))
      .map((cp) => {
        const fp = frozenById.get(cp.perspective_id)!;
        return { id: cp.perspective_id, name: cp.name, then: Number(fp.score), now: cp.score, delta: cp.score - Number(fp.score) };
      })
      .filter((r) => Number.isFinite(r.delta))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return { frozenScore, enterpriseDelta: calc.score - frozenScore, rows };
  }, [refSnapshot, calc, refItemsQ.data]);

  // ── Judgment band inputs (anchor 01: one composed executive argument) ───────
  // CC-DEF-001: a perspective "drags" ONLY when it sits strictly below the
  // server-calculated enterprise score. All perspectives at the enterprise score
  // (e.g. all 100 / On track) → no drag clause, truthful no-drag state instead.
  const dragPerspective = useMemo(() => selectDragPerspective(calc), [calc]);
  // CC-DEF-002: Δ derives from the SAME official series the trend chart renders.
  const scoreDelta = useMemo(
    () => computeScoreDelta(trendPoints, activePeriod?.name ?? null),
    [trendPoints, activePeriod],
  );
  // Composed exception clauses — zero-assumption: only data-bearing clauses appear.
  const judgmentClauses: React.ReactNode[] = [];
  if (dragPerspective) {
    judgmentClauses.push(
      <React.Fragment key="persp">
        <InlineLink onClick={() => { if (instance?.slug) navigate(Routes.strata.scorecard(instance.slug)); }}>
          {`${dragPerspective.name} (${fmtScore(dragPerspective.score)})`}
        </InlineLink>
        {' drags the enterprise score'}
      </React.Fragment>,
    );
  }
  if (!varQ.isError && varQ.data?.value != null && portfolio?.slug) {
    // CC-DEF-005: portfolios carry no cycle/period — the VaR figure is a
    // deliberate Global exception and is labelled as such, never period-scoped.
    judgmentClauses.push(
      <React.Fragment key="var">
        <InlineLink onClick={() => navigate(Routes.strata.portfolioEvidence(portfolio.slug!, Routes.strata.root()))}>
          {fmtSarCompact(varQ.data.value)}
        </InlineLink>
        {' of portfolio value is at risk against plan (Global — not period-scoped)'}
      </React.Fragment>,
    );
  }
  if (decisionScope.scoped > 0) {
    judgmentClauses.push(
      <React.Fragment key="dec">
        <InlineLink onClick={() => navigate(Routes.strata.reviews())}>
          {`${decisionScope.scoped} ${decisionScope.scoped === 1 ? 'decision is' : 'decisions are'} waiting in this cycle`}
        </InlineLink>
      </React.Fragment>,
    );
  }
  if (decisionScope.global > 0) {
    judgmentClauses.push(
      <React.Fragment key="dec-global">
        <InlineLink onClick={() => navigate(Routes.strata.reviews())}>
          {`${decisionScope.global} Global ${decisionScope.global === 1 ? 'decision' : 'decisions'} (no cycle) ${decisionScope.global === 1 ? 'is' : 'are'} open`}
        </InlineLink>
      </React.Fragment>,
    );
  }
  const judgmentSentence: React.ReactNode = judgmentClauses.length > 0
    ? (
      <>
        {judgmentClauses.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 ? (i === judgmentClauses.length - 1 ? ', and ' : ', ') : ''}
            {c}
          </React.Fragment>
        ))}
        {'.'}
      </>
    )
    : 'No perspective is below the enterprise score and no decisions are waiting in this cycle.';

  // ── Context-spine scope + freshness (from real data; omit when unknown) ────
  const latestRunAt = useMemo(() => {
    const times = (uploadRunsQ.data ?? [])
      .map((r) => r.completed_at)
      .filter((t): t is string => !!t);
    return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
  }, [uploadRunsQ.data]);
  const pendingValidationCount = useMemo(
    () => (uploadRunsQ.data ?? []).filter((r) => r.status === 'pending_attestation').length,
    [uploadRunsQ.data],
  );
  const sourceCount = dataSourcesQ.data?.length ?? null;
  const activeSourceCount = dataSourcesQ.data
    ? dataSourcesQ.data.filter((s) => s.status === 'active').length
    : null;
  // The command centre is enterprise-scoped by definition (factual, not assumed).
  const scopeNode = (
    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
      Scope <strong style={{ color: T.text, fontWeight: 600 }}>Enterprise</strong>
    </span>
  );
  // CC-DEF-005: upload runs carry no period — freshness is a Global data-plane
  // fact and is labelled so it is never read as a period-scoped claim.
  const freshnessNode = latestRunAt ? (
    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
      Data as of <strong style={{ color: T.text, fontWeight: 600 }}>{fmtDate(latestRunAt)}</strong> · Global
    </span>
  ) : null;

  // CC-DEF-006: stack the trend/health row on narrow viewports (1024×768, 200% zoom)
  // so no Command Center control needs document-level horizontal scrolling.
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 1279px)').matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(max-width: 1279px)');
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <StrataPageShell
      docTitle="Command Center"
      modelLabel={instance?.name ?? null}
      state={dataState}
      scope={scopeNode}
      freshness={freshnessNode}
      testId="strata-cc-chrome"
    >
      {isLoading || rolesQ.isLoading ? (
        <LoadingSkeleton />
      ) : noStrataRole ? (
        <EmptyState
          size="default"
          header="You don't have access to the Command Center"
          description="Your account has no STRATA role, so strategy data is restricted. Ask a STRATA administrator or the strategy office to grant a role, then reload this page."
          testId="strata-cc-restricted"
        />
      ) : !activeCycle ? (
        <EmptyState
          size="compact"
          header="No strategy cycles yet"
          description="Create a strategy cycle in STRATA admin to activate the command center."
          testId="strata-cc-empty"
        />
      ) : (
        <>
        {fixtureCalc ? (
          <div style={{ marginBottom: 16 }} data-testid="strata-cc-fixture-banner">
            <SectionMessage appearance="warning" title="Fixture mode — synthetic scorecard data">
              <p>{`This page is rendering the deterministic '${fixtureKey}' test fixture through the real Command Center derivation path. No live records are read or modified. Remove ?ccFixture from the URL to return to live data.`}</p>
            </SectionMessage>
          </div>
        ) : null}
        {dataState === 'locked' && lockedSnapshot ? (
          <div style={{ marginBottom: 16 }}>
            <StrataSnapshotBand
              snapshotKey={lockedSnapshot.snapshot_key}
              frozenAt={fmtDateTime(lockedSnapshot.locked_at)}
              basis={lockedSnapshot.name}
              testId="strata-cc-snapshot-band"
            />
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 16 }}>
          {/* ── Row 1: judgment band — one composed executive argument ──────── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <section
              data-testid="strata-cc-judgment"
              style={{
                border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised,
                boxShadow: 'var(--ds-shadow-raised)', padding: 'var(--ds-space-250)',
                display: 'flex', gap: 'var(--ds-space-250)', alignItems: 'center', minWidth: 0,
                flexWrap: 'wrap',
              }}
            >
              <StrataScoreRing
                score={calc?.has_data ? calc.score : null}
                bandKey={calc?.status_key}
                size={88}
                strokeWidth={8}
                testId="strata-cc-judgment-ring"
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest }}>
                    {`ENTERPRISE SCORE${activePeriod ? ` · ${activePeriod.name}` : ''}`}
                  </span>
                  <StrataBandLozenge bandKey={calc?.has_data ? calc?.status_key : null} />
                  {scoreDelta ? (
                    <span style={{
                      fontSize: 'var(--ds-font-size-100)', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                      color: scoreDelta.delta >= 0 ? 'var(--ds-text-success)' : 'var(--ds-text-danger)',
                    }}>
                      {`${scoreDelta.delta >= 0 ? '▲' : '▼'} ${fmtScore(Math.abs(scoreDelta.delta))} vs ${scoreDelta.priorLabel}`}
                    </span>
                  ) : null}
                </div>
                {calcQ.isError ? (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>
                    The enterprise score could not be loaded for this period.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)', color: T.text, textWrap: 'pretty' }}>
                    {judgmentSentence}
                  </p>
                )}
                <div style={{ marginTop: 12, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                  {`Server-calculated${instance?.name ? ` · ${instance.name}` : ''}`}
                  {instance?.slug ? (
                    <>
                      {' · '}
                      <InlineLink onClick={() => navigate(Routes.strata.scorecardEvidence(instance.slug!, Routes.strata.root()))}>
                        View evidence
                      </InlineLink>
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          {/* ── Row 2: enterprise score trend + perspective health ─────────── */}
          <div style={{ gridColumn: `span ${isNarrow ? 12 : 8}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <StrataPanel
              title="Enterprise score trend"
              icon={<TrendingUp size={16} />}
              count={trendPoints.length > 0 ? trendPoints.length : null}
              testId="strata-cc-trend"
            >
              {trendQ.isError ? (
                <PanelError error={trendQ.error} />
              ) : trendQ.isLoading ? (
                <div aria-hidden style={{ height: 220, borderRadius: 8, background: T.neutral }} />
              ) : trendPoints.length < 2 ? (
                <EmptyState
                  size="compact"
                  header="Not enough history"
                  description="Trend appears once two periods have calculated scores."
                />
              ) : (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendPoints} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                      <defs>
                        {/* Same brand token as the stroke — fade via stopOpacity, no raw color functions. */}
                        <linearGradient id="strataTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--ds-text-brand)" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="var(--ds-text-brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={{ stroke: 'var(--ds-border)' }}
                        tick={{ fontSize: LABEL.fontSize as number, fill: 'var(--ds-text-subtlest)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: LABEL.fontSize as number, fill: 'var(--ds-text-subtlest)' }}
                      />
                      <RechartsTooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--ds-border)' }} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="var(--ds-text-brand)"
                        strokeWidth={2}
                        fill="url(#strataTrendFill)"
                        dot={<TrendDot tone={bandTone} bandLabelFor={bandLabelFor} onPointClick={openTrendEvidence} />}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </StrataPanel>
          </div>

          <div style={{ gridColumn: `span ${isNarrow ? 12 : 4}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <StrataPanel
              title="Perspective health"
              icon={<PieChart size={16} />}
              count={calc?.perspectives.length ?? null}
              testId="strata-cc-perspectives"
            >
              {calcQ.isError ? (
                <PanelError error={calcQ.error} />
              ) : !calc || calc.perspectives.length === 0 ? (
                <EmptyState size="compact" header="No perspective scores" description="The calc engine has not produced perspective scores for this period." />
              ) : (
                calc.perspectives.map((p) => (
                  <ClickableRow
                    key={p.perspective_id}
                    onClick={instance?.slug ? () => navigate(Routes.strata.scorecard(instance.slug!)) : undefined}
                    testId={`strata-cc-perspective-${p.perspective_id}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
                          Weight {fmtScore(p.weight)}
                        </span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <StrataBandBar value={p.has_data ? p.score : null} bandKey={p.has_data ? p.status_key : null} height={4} />
                      </div>
                    </div>
                    <span style={{
                      fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text,
                      flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontFamily: T.fontDisplay,
                    }}>
                      {scoreText(p.score, p.has_data)}
                    </span>
                    <StrataBandLozenge bandKey={p.has_data ? p.status_key : null} />
                  </ClickableRow>
                ))
              )}
            </StrataPanel>
          </div>

          {/* ── Row 3: changes since the last locked review (D-3 client diff) ── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataPanel
              title="Since the last locked review"
              icon={<History size={16} />}
              count={changesDiff ? changesDiff.rows.length : null}
              testId="strata-cc-changes"
            >
              {snapshotsQ.isError ? (
                <PanelError error={snapshotsQ.error} />
              ) : (snapshotsQ.isLoading || (!!refSnapshot && refItemsQ.isLoading)) ? (
                <div aria-hidden style={{ height: 72, borderRadius: 8, background: T.neutral }} />
              ) : !changesDiff ? (
                <EmptyState
                  size="compact"
                  header="No prior locked review to compare"
                  description="Once an executive review is locked for this cycle, movement in the enterprise score and each perspective since that lock appears here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    paddingBottom: 12, marginBottom: 4, borderBottom: `1px solid ${T.border}`,
                  }}>
                    <StrataBandLozenge bandKey={calc?.has_data ? calc?.status_key : null} />
                    <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                      Enterprise score {fmtScore(calc!.score)}
                    </span>
                    <DeltaText delta={changesDiff.enterpriseDelta} />
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                      {`since ${refSnapshot!.snapshot_key} (${fmtScore(changesDiff.frozenScore)}, ${fmtDate(refSnapshot!.locked_at)})`}
                    </span>
                  </div>
                  {changesDiff.rows.length === 0 ? (
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, padding: '4px 0' }}>
                      No perspective is comparable across the two reviews.
                    </span>
                  ) : (
                    changesDiff.rows.map((r) => (
                      <div
                        key={r.id}
                        data-testid={`strata-cc-change-${r.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--ds-space-075) 0' }}
                      >
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', color: T.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.name}
                        </span>
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {`${fmtScore(r.then)} → ${fmtScore(r.now)}`}
                        </span>
                        <DeltaText delta={r.delta} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </StrataPanel>
          </div>

          {/* ── Row 4: needs attention — one actionable inbox ──────────────── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataPanel
              title="Needs attention"
              icon={<AlertTriangle size={16} />}
              count={needsAttentionQ.isLoading ? null : visibleAttentionRows.length}
              noPadding={visibleAttentionRows.length > 0}
              testId="strata-cc-needs-attention"
              actions={
                <div style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="Filter items needing attention">
                  <Button
                    appearance={attentionScope === 'all' ? 'primary' : 'subtle'}
                    spacing="compact"
                    onClick={() => setAttentionScope('all')}
                    testId="strata-cc-attention-all"
                  >
                    All
                  </Button>
                  <Button
                    appearance={attentionScope === 'mine' ? 'primary' : 'subtle'}
                    spacing="compact"
                    onClick={() => setAttentionScope('mine')}
                    testId="strata-cc-attention-mine"
                  >
                    {`Mine${mineCount ? ` (${mineCount})` : ''}`}
                  </Button>
                </div>
              }
            >
              {attentionError ? (
                <div style={{ padding: visibleAttentionRows.length > 0 ? 16 : 0 }}>
                  <PanelError error={attentionError} />
                </div>
              ) : null}
              {needsAttentionQ.isLoading ? (
                <div aria-hidden style={{ height: 96, borderRadius: 8, background: T.neutral, margin: 16 }} />
              ) : visibleAttentionRows.length === 0 ? (
                !attentionError ? (
                  <EmptyState
                    size="compact"
                    header={attentionScope === 'mine' ? 'Nothing is waiting on you.' : 'Nothing needs attention — all queues clear.'}
                    description={attentionScope === 'mine'
                      ? 'Items assigned to you — validations, blockers, overdue actions and delayed projects you own — appear here. Switch to All to see every open queue.'
                      : 'Pending attestations and validations, blocked dependencies, overdue actions and gates, broken assumptions, missing actuals and upload rejections land here.'}
                    primaryAction={attentionScope === 'mine' && attentionRows.length > 0 ? (
                      <Button
                        appearance="primary"
                        spacing="compact"
                        onClick={() => setAttentionScope('all')}
                        testId="strata-cc-attention-clear-mine"
                      >
                        {`Show all ${attentionRows.length} items`}
                      </Button>
                    ) : undefined}
                  />
                ) : null
              ) : (
                <JiraTable<AttentionRow>
                  columns={attentionColumns}
                  data={visibleAttentionRows}
                  getRowId={(r) => r.id}
                  onRowClick={(r) => r.nav?.()}
                  rowAriaLabel={(r) => r.ariaLabel}
                  showRowCount={false}
                  ariaLabel="Items needing attention in the selected cycle"
                />
              )}
              {/* CC-DEF-005: deliberately cycle-less sources — visibly separate,
                  NEVER included in the selected-period total above. */}
              {!needsAttentionQ.isLoading && globalAttentionRows.length > 0 ? (
                <div data-testid="strata-cc-attention-global" style={{ borderTop: `1px solid ${T.border}` }}>
                  <div style={{
                    padding: '12px 16px 4px', fontSize: 'var(--ds-font-size-050)', fontWeight: 600,
                    color: T.subtlest, letterSpacing: '0.04em',
                  }}>
                    {`GLOBAL — NOT CYCLE/PERIOD-SCOPED (${globalAttentionRows.length}) · EXCLUDED FROM THE TOTAL ABOVE`}
                  </div>
                  <JiraTable<AttentionRow>
                    columns={attentionColumns}
                    data={globalAttentionRows}
                    getRowId={(r) => r.id}
                    onRowClick={(r) => r.nav?.()}
                    rowAriaLabel={(r) => `Global, not cycle-scoped: ${r.ariaLabel}`}
                    showRowCount={false}
                    ariaLabel="Global items not scoped to any cycle or period"
                  />
                </div>
              ) : null}
            </StrataPanel>
          </div>

          {/* ── Row 5: AI advisory — drafts pending human review (F-GOV-009) ── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataPanel
              title="AI advisory"
              icon={<Sparkles size={16} />}
              count={aiOutputsQ.isLoading ? null : scopedAdvisories.length}
              testId="strata-cc-ai-advisory"
              actions={canAdvise ? (
                <Button
                  appearance="default"
                  spacing="compact"
                  isDisabled={!activePeriod || advisoryBusy !== null}
                  onClick={() => {
                    if (activePeriod) void runAdvisoryAction('generate', () => governanceApi.generateAdvisory(activePeriod.id));
                  }}
                  testId="strata-cc-generate-advisory"
                >
                  {advisoryBusy === 'generate' ? 'Generating…' : 'Generate advisory'}
                </Button>
              ) : undefined}
            >
              {advisoryError ? (
                <div style={{ marginBottom: 12 }}>
                  <SectionMessage appearance="error" title="Advisory action rejected">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{advisoryError}</p>
                  </SectionMessage>
                </div>
              ) : null}
              {aiOutputsQ.isError ? (
                <PanelError error={aiOutputsQ.error} />
              ) : aiOutputsQ.isLoading ? (
                <div aria-hidden style={{ height: 96, borderRadius: 8, background: T.neutral }} />
              ) : scopedAdvisories.length === 0 ? (
                <EmptyState
                  size="compact"
                  header="No advisories yet"
                  description={canAdvise
                    ? (activePeriod
                      ? 'Generate an advisory draft for the active period — it stays pending until a different person reviews it.'
                      : 'Select an active period to generate an advisory draft.')
                    : 'Advisory drafts generated by the strategy office appear here after human review.'}
                />
              ) : (
                scopedAdvisories.map((a) => {
                  const isPending = a.human_review_status === 'pending';
                  const confidence = fmtAdvisoryConfidence(a.confidence);
                  return (
                    <div
                      key={a.id}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}
                      data-testid={`strata-cc-advisory-${a.id}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Lozenge appearance={ADVISORY_REVIEW_LOZENGE[a.human_review_status] ?? 'default'}>
                          {isPending ? 'Pending human review' : labelize(a.human_review_status)}
                        </Lozenge>
                        {a.model ? <CatalystTag text={a.model} /> : null}
                        {a.scopeLabel === 'global' ? <Lozenge appearance="default">Global — not cycle-scoped</Lozenge> : null}
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                          {[
                            confidence ? `Confidence ${confidence}` : null,
                            `Generated ${fmtDateTime(a.generated_at)}`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                        {isPending && canAdvise ? (
                          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
                            <Button
                              spacing="compact"
                              isDisabled={advisoryBusy !== null}
                              onClick={() => void runAdvisoryAction(a.id, () => governanceApi.reviewAdvisory(a.id, 'approved'))}
                              testId={`strata-cc-advisory-approve-${a.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              spacing="compact"
                              appearance="subtle"
                              isDisabled={advisoryBusy !== null}
                              onClick={() => void runAdvisoryAction(a.id, () => governanceApi.reviewAdvisory(a.id, 'rejected'))}
                              testId={`strata-cc-advisory-reject-${a.id}`}
                            >
                              Reject
                            </Button>
                          </span>
                        ) : null}
                      </div>
                      {isPending ? (
                        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-warning)' }}>
                          Advisory — pending human review. Do not act on this content until it is approved.
                        </span>
                      ) : null}
                      <p style={{
                        margin: 0, fontSize: 'var(--ds-font-size-200)', color: isPending ? T.subtle : T.text,
                        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                      }}>
                        {a.content}
                      </p>
                    </div>
                  );
                })
              )}
            </StrataPanel>
          </div>

          {/* ── Row 6: data-trust strip — subordinate, always present ──────── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <div
              data-testid="strata-cc-data-trust"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--ds-space-250)', flexWrap: 'wrap',
                padding: 'var(--ds-space-150) var(--ds-space-200)', borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.sunken,
                fontSize: 'var(--ds-font-size-100)', color: T.subtle,
              }}
            >
              <span style={{ fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest, fontSize: 'var(--ds-font-size-050)' }}>DATA TRUST · GLOBAL (ALL PERIODS)</span>
              {dataSourcesQ.isError ? (
                <span style={{ color: 'var(--ds-text-danger)' }}>Sources could not be loaded</span>
              ) : dataSourcesQ.isLoading ? (
                <span>Loading sources…</span>
              ) : (
                <>
                  <span>
                    <strong style={{ color: T.text }}>{sourceCount ?? '—'}</strong>{` ${sourceCount === 1 ? 'source' : 'sources'}`}
                    {activeSourceCount != null ? ` · ${activeSourceCount} active` : ''}
                  </span>
                  <span>
                    <strong style={{ color: T.text }}>{uploadRunsQ.data ? pendingValidationCount : '—'}</strong> actuals pending validation
                  </span>
                </>
              )}
              <span style={{ marginLeft: 'auto' }}>
                <InlineLink onClick={() => navigate(Routes.strata.data())}>Open Data &amp; Lineage →</InlineLink>
              </span>
            </div>
          </div>
        </div>
        </>
      )}
    </StrataPageShell>
  );
}
