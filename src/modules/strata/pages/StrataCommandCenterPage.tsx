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
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { Button, CatalystTag, EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { LABEL } from '@/components/project-hub/dashboard/dashboardTypography';
import { Routes } from '@/lib/routes';
import { AlertTriangle, PieChart, Sparkles, TrendingUp } from '@/lib/atlaskit-icons';
import { governanceApi } from '@/modules/strata/domain';
import {
  useStrataContext,
  useScorecardInstances,
  useScorecardCalc,
  usePortfolios,
  useValueAtRisk,
  useBenefits,
  useBenefitRealization,
  useDecisions,
  useDependencies,
  useKpis,
  useNeedsAttention,
  useEnterpriseScoreTrend,
  useAiOutputs,
  useStrataRoles,
  useInvalidateStrata,
} from '@/modules/strata/hooks/useStrata';
import {
  T,
  StrataPageShell,
  StrataPanel,
  StrataStatStrip,
  StrataBandBar,
  StrataBandLozenge,
  useBandTone,
  type StrataStat,
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

// ── Enterprise score trend ────────────────────────────────────────────────────
interface TrendChartPoint {
  label: string;
  score: number;
  statusKey: string | null;
  slug: string | null;
}

/** Band-toned dot; click navigates to the period's scorecard evidence. */
function TrendDot(props: {
  cx?: number; cy?: number; payload?: TrendChartPoint;
  tone: (bandKey?: string | null) => string;
  onPointClick: (p: TrendChartPoint) => void;
}) {
  const { cx, cy, payload, tone, onPointClick } = props;
  if (cx == null || cy == null || !payload) return null;
  const clickable = !!payload.slug;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={tone(payload.statusKey)}
      stroke={T.raised}
      strokeWidth={1.5}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      onClick={clickable ? () => onPointClick(payload) : undefined}
      data-testid={`strata-cc-trend-dot-${payload.label}`}
    />
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
};

// ── AI advisory (F-GOV-009: draft → human review; reviewer ≠ author is DB-enforced) ─
/** UI affordance gating only — the edge function / DB enforce the real rules. */
const ADVISORY_ROLES: readonly string[] = ['strategy_office', 'executive_viewer', 'vmo_validator', 'strata_admin'];

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

  // ── Scorecard: the instance for the active period, server-calculated ──────
  const instancesQ = useScorecardInstances(activeCycle?.id);
  const instance = useMemo(
    () => (instancesQ.data ?? []).find((i) => activePeriod && i.period_id === activePeriod.id) ?? null,
    [instancesQ.data, activePeriod],
  );
  const calcQ = useScorecardCalc(instance);
  const calc: ScorecardCalcResult | null = calcQ.data ?? null;

  // ── Enterprise score trend (server-calculated history only) ───────────────
  const trendQ = useEnterpriseScoreTrend(activeCycle?.id);

  // ── Value at risk (first portfolio) ────────────────────────────────────────
  const portfoliosQ = usePortfolios();
  const portfolio = portfoliosQ.data?.[0] ?? null;
  const varQ = useValueAtRisk(portfolio?.id);

  // ── Benefits realization (top benefit) ─────────────────────────────────────
  const benefitsQ = useBenefits();
  const topBenefit = benefitsQ.data?.[0] ?? null;
  const realizationQ = useBenefitRealization(topBenefit?.id);

  // ── Governance / execution counts ──────────────────────────────────────────
  const decisionsQ = useDecisions();
  const dependenciesQ = useDependencies();
  const kpisQ = useKpis();
  // Server-side rule engine feed — replaces the former client-composed inbox.
  const needsAttentionQ = useNeedsAttention(activePeriod?.id);

  // ── AI advisory (generate + human review) ──────────────────────────────────
  const aiOutputsQ = useAiOutputs();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const canAdvise = (rolesQ.data ?? []).some((r) => ADVISORY_ROLES.includes(r));
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

  const openDecisions = useMemo(
    () => (decisionsQ.data ?? []).filter((d) => d.status === 'open'),
    [decisionsQ.data],
  );
  // Live blocked-dependency rows (same rule as the engine's blocked_dependency).
  const blockedDeps = useMemo(
    () => (dependenciesQ.data ?? []).filter(
      (d) => (d.is_blocker || d.status === 'blocked') && !['resolved', 'cancelled'].includes(d.status),
    ),
    [dependenciesQ.data],
  );
  // Pending attestations for the active period — from the rule-engine feed.
  const pendingAttestations = useMemo(
    () => (needsAttentionQ.data ?? []).filter((r) => r.item_type === 'pending_attestation'),
    [needsAttentionQ.data],
  );

  const kpiById = useMemo(
    () => new Map((kpisQ.data ?? []).map((k) => [k.id, k])),
    [kpisQ.data],
  );
  const benefitById = useMemo(
    () => new Map((benefitsQ.data ?? []).map((b) => [b.id, b])),
    [benefitsQ.data],
  );

  // ── Trend points: period-named, ordered by period starts_on ───────────────
  const trendPoints: TrendChartPoint[] = useMemo(() => {
    const periodById = new Map(periods.map((p) => [p.id, p]));
    return (trendQ.data ?? [])
      .map((pt) => {
        const period = pt.periodId ? periodById.get(pt.periodId) : undefined;
        return {
          label: period?.name ?? '—',
          startsOn: period?.starts_on ?? '',
          score: pt.score,
          statusKey: pt.statusKey,
          slug: pt.slug,
        };
      })
      .sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0))
      .map(({ startsOn: _startsOn, ...rest }) => rest);
  }, [trendQ.data, periods]);

  const openTrendEvidence = (p: TrendChartPoint) => {
    if (p.slug) navigate(Routes.strata.scorecardEvidence(p.slug));
  };

  // ── Needs attention rows (server rule engine → drill to owning surface) ────
  const attentionRows: AttentionRow[] = useMemo(() => {
    /** Each row drills to the surface that owns its entity type. */
    const navFor = (entityType: string, entityId: string): (() => void) | undefined => {
      switch (entityType) {
        case 'kpi': {
          const slug = kpiById.get(entityId)?.slug;
          return () => navigate(slug ? Routes.strata.kpi(slug) : Routes.strata.kpis());
        }
        case 'benefit': {
          // Drill to the benefit detail via its slug; fall back to the portfolio index when unresolved.
          const slug = benefitById.get(entityId)?.slug;
          return () => navigate(slug ? Routes.strata.benefit(slug) : Routes.strata.portfolio());
        }
        case 'portfolio':
          return () => navigate(Routes.strata.portfolio());
        case 'initiative':
        case 'project_card':
          return () => navigate(Routes.strata.execution());
        case 'action':
        case 'decision':
          return () => navigate(Routes.strata.reviews());
        case 'upload_run':
          return () => navigate(Routes.strata.data());
        case 'element':
          return () => navigate(Routes.strata.strategy());
        default:
          return undefined;
      }
    };
    return (needsAttentionQ.data ?? []).map((r, i) => ({
      id: `${r.item_type}-${r.entity_id}-${i}`,
      itemType: r.item_type,
      severity: r.severity,
      entityName: r.entity_name,
      detail: r.detail,
      due: r.due_date,
      nav: navFor(r.entity_type, r.entity_id),
    }));
  }, [needsAttentionQ.data, kpiById, benefitById, navigate]);

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
      cell: ({ row }) => row.due ? (
        <span style={{
          fontSize: 'var(--ds-font-size-100)',
          color: isOverdue(row.due) ? 'var(--ds-text-danger)' : T.subtlest,
          fontWeight: isOverdue(row.due) ? 600 : 400,
          whiteSpace: 'nowrap',
        }}>
          {fmtDate(row.due)}
        </span>
      ) : (
        <span style={{ color: T.subtlest }}>—</span>
      ),
    },
  ], []);

  // ── Page states ─────────────────────────────────────────────────────────────
  const isLoading = ctxLoading || instancesQ.isLoading || (!!instance && calcQ.isLoading);
  const dataState = instance ? (instance.status === 'locked' ? 'locked' : 'live') : null;

  // ── Executive stat strip (hero: enterprise score ring) ─────────────────────
  const stats: StrataStat[] = [
    calcQ.isError
      ? {
          key: 'enterprise', label: 'Enterprise score', value: '—',
          caption: 'Could not load score', captionTone: 'danger',
          testId: 'strata-cc-enterprise-score',
        }
      : {
          key: 'enterprise',
          label: 'Enterprise score',
          value: scoreText(calc?.score, calc?.has_data),
          ring: { score: calc?.has_data ? calc.score : null, bandKey: calc?.status_key },
          bandKey: calc?.has_data ? calc?.status_key : null,
          caption: instance
            ? (instance.slug ? 'View evidence' : 'Evidence route needs a slug')
            : 'No scorecard for this period',
          onClick: instance?.slug ? () => navigate(Routes.strata.scorecardEvidence(instance.slug!)) : undefined,
          testId: 'strata-cc-enterprise-score',
        },
    {
      key: 'var',
      label: 'Value at risk',
      value: varQ.isError ? '—' : fmtSarCompact(varQ.data?.value),
      bandKey: varQ.data?.status_key,
      caption: varQ.isError ? 'Could not load' : portfolio ? (portfolio.slug ? 'View evidence' : 'Evidence route needs a slug') : 'No portfolio',
      captionTone: varQ.isError ? 'danger' : 'neutral',
      onClick: portfolio?.slug ? () => navigate(Routes.strata.portfolioEvidence(portfolio.slug!)) : undefined,
      testId: 'strata-cc-var',
    },
    {
      key: 'benefits',
      label: 'Benefits realization',
      value: realizationQ.isError ? '—' : fmtRatioPct(realizationQ.data?.value),
      ring: realizationQ.data?.value != null
        ? { score: realizationQ.data.value * 100, bandKey: realizationQ.data.status_key }
        : undefined,
      caption: topBenefit ? `Realized vs planned — ${topBenefit.name}` : 'No benefits registered',
      testId: 'strata-cc-benefits',
    },
    {
      key: 'decisions',
      label: 'Open decisions',
      value: decisionsQ.data ? openDecisions.length : '—',
      caption: 'Awaiting a decision forum',
      captionTone: openDecisions.length > 0 ? 'warning' : 'neutral',
      onClick: () => navigate(Routes.strata.reviews()),
      testId: 'strata-cc-open-decisions',
    },
    {
      key: 'deps',
      label: 'Blocked dependencies',
      value: dependenciesQ.data ? blockedDeps.length : '—',
      caption: 'Cross-initiative blockers',
      captionTone: blockedDeps.length > 0 ? 'danger' : 'neutral',
      onClick: () => navigate(Routes.strata.execution()),
      testId: 'strata-cc-blocked-deps',
    },
    {
      key: 'attestations',
      label: 'Pending attestations',
      value: needsAttentionQ.data ? pendingAttestations.length : '—',
      caption: activePeriod ? `KPI actuals in ${activePeriod.name}` : 'No active period',
      captionTone: pendingAttestations.length > 0 ? 'warning' : 'neutral',
      onClick: () => navigate(Routes.strata.data()),
      testId: 'strata-cc-pending-attestations',
    },
  ];

  return (
    <StrataPageShell
      docTitle="Command Center"
      modelLabel={instance?.name ?? null}
      state={dataState}
      testId="strata-cc-chrome"
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : !activeCycle ? (
        <EmptyState
          size="compact"
          header="No strategy cycles yet"
          description="Create a strategy cycle in STRATA admin to activate the command center."
          testId="strata-cc-empty"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 16 }}>
          {/* ── Row 1: executive stat strip ─────────────────────────────────── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataStatStrip items={stats} testId="strata-cc-hero" />
          </div>

          {/* ── Row 2: enterprise score trend + perspective health ─────────── */}
          <div style={{ gridColumn: 'span 8', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                        dot={<TrendDot tone={bandTone} onPointClick={openTrendEvidence} />}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </StrataPanel>
          </div>

          <div style={{ gridColumn: 'span 4', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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

          {/* ── Row 3: needs attention — one actionable inbox ──────────────── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataPanel
              title="Needs attention"
              icon={<AlertTriangle size={16} />}
              count={needsAttentionQ.isLoading ? null : attentionRows.length}
              noPadding={attentionRows.length > 0}
              testId="strata-cc-needs-attention"
            >
              {attentionError ? (
                <div style={{ padding: attentionRows.length > 0 ? 16 : 0 }}>
                  <PanelError error={attentionError} />
                </div>
              ) : null}
              {needsAttentionQ.isLoading ? (
                <div aria-hidden style={{ height: 96, borderRadius: 8, background: T.neutral, margin: 16 }} />
              ) : attentionRows.length === 0 ? (
                !attentionError ? (
                  <EmptyState
                    size="compact"
                    header="Nothing needs attention — all queues clear."
                    description="Pending attestations and validations, blocked dependencies, overdue actions and gates, broken assumptions, missing actuals and upload rejections land here."
                  />
                ) : null
              ) : (
                <JiraTable<AttentionRow>
                  columns={attentionColumns}
                  data={attentionRows}
                  getRowId={(r) => r.id}
                  onRowClick={(r) => r.nav?.()}
                  showRowCount={false}
                  ariaLabel="Items needing attention"
                />
              )}
            </StrataPanel>
          </div>

          {/* ── Row 4: AI advisory — drafts pending human review (F-GOV-009) ── */}
          <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
            <StrataPanel
              title="AI advisory"
              icon={<Sparkles size={16} />}
              count={aiOutputsQ.isLoading ? null : (aiOutputsQ.data ?? []).length}
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
              ) : (aiOutputsQ.data ?? []).length === 0 ? (
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
                (aiOutputsQ.data ?? []).map((a) => {
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
        </div>
      )}
    </StrataPageShell>
  );
}
