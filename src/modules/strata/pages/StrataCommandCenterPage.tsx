/**
 * STRATA Executive Command Center (route /strata) — CAT-STRATA-20260705-001.
 *
 * Executive workbench: every panel supports a decision, explains a metric,
 * shows a trend, or navigates to evidence — decorative panels banned.
 *
 * Layout (12-col grid):
 *   Row 1 — executive stat strip (evidence-route navigation on score/VaR).
 *   Row 2 — Enterprise score trend (8) + Perspective health (4).
 *   Row 3 — Needs attention: ONE actionable inbox (JiraTable) merging
 *           exceptions, open decisions, open actions, pending attestations
 *           and pending AI advisories.
 *
 * Every score/band/rollup on this page is server-calculated (strata_calc_*
 * RPCs or frozen snapshot payloads) — the UI only renders and counts rows.
 * ADS tokens only. No silent failures: every failing query surfaces.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { LABEL } from '@/components/project-hub/dashboard/dashboardTypography';
import { Routes } from '@/lib/routes';
import { AlertTriangle, PieChart, TrendingUp } from '@/lib/atlaskit-icons';
import { kpiApi } from '@/modules/strata/domain';
import {
  useStrataContext,
  useScorecardInstances,
  useScorecardCalc,
  useScorecardLines,
  usePortfolios,
  useValueAtRisk,
  useBenefits,
  useBenefitRealization,
  useDecisions,
  useActions,
  useDependencies,
  useAiOutputs,
  useKpis,
  useThresholdSchemes,
  useEnterpriseScoreTrend,
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
  fmtDate, fmtRatioPct, fmtSarCompact, fmtScore, labelize,
} from '@/modules/strata/components/format';
import type { ScorecardCalcResult, ThresholdBand } from '@/modules/strata/types';

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

// ── Needs attention inbox ────────────────────────────────────────────────────
type AttentionType = 'Exception' | 'Decision' | 'Action' | 'Attestation' | 'Advisory';

interface AttentionRow {
  id: string;
  type: AttentionType;
  title: string;
  context: string;
  /** Due date ISO (decisions/actions) — rendered danger when overdue. */
  due: string | null;
  /** Non-date meta (confidence %, score) when no due date applies. */
  meta: string | null;
  /** Governed band key (exceptions) — null shows the status lozenge instead. */
  bandKey: string | null;
  statusLabel: string | null;
  statusAppearance: React.ComponentProps<typeof Lozenge>['appearance'];
  nav?: () => void;
}

const TYPE_LOZENGE: Record<AttentionType, React.ComponentProps<typeof Lozenge>['appearance']> = {
  Exception: 'removed',
  Decision: 'inprogress',
  Action: 'default',
  Attestation: 'moved',
  Advisory: 'new',
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
  const linesQ = useScorecardLines(instance?.id);

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
  const actionsQ = useActions();
  const dependenciesQ = useDependencies();
  const aiQ = useAiOutputs();
  const kpisQ = useKpis();
  const schemesQ = useThresholdSchemes();

  const attestationsQ = useQuery({
    queryKey: ['strata', 'actuals-for-period', activePeriod?.id],
    queryFn: () => kpiApi.actualsForPeriod(activePeriod!.id),
    enabled: !!activePeriod,
    staleTime: 30_000,
  });

  const openDecisions = useMemo(
    () => (decisionsQ.data ?? []).filter((d) => d.status === 'open'),
    [decisionsQ.data],
  );
  const openActions = useMemo(
    () => (actionsQ.data ?? []).filter((a) => a.status === 'open' || a.status === 'in_progress'),
    [actionsQ.data],
  );
  const blockedDeps = useMemo(
    () => (dependenciesQ.data ?? []).filter((d) => d.status === 'blocked'),
    [dependenciesQ.data],
  );
  const pendingAttestations = useMemo(
    () => (attestationsQ.data ?? []).filter((a) => a.validation_status === 'pending'),
    [attestationsQ.data],
  );
  const pendingAi = useMemo(
    () => (aiQ.data ?? []).filter((a) => a.human_review_status === 'pending'),
    [aiQ.data],
  );

  // ── Exceptions: calc lines whose governed band ≠ the scheme's best band ───
  const bestBandKeys = useMemo(() => {
    const keys = new Set<string>();
    (schemesQ.data ?? []).forEach((s) => {
      const best = (s.bands ?? []).reduce<ThresholdBand | null>(
        (acc, b) => (acc == null || b.min_score > acc.min_score ? b : acc), null,
      );
      if (best) keys.add(best.key);
    });
    return keys;
  }, [schemesQ.data]);

  const kpiIdByLineId = useMemo(() => {
    const m = new Map<string, string>();
    (linesQ.data ?? []).forEach((l) => { if (l.kpi_id) m.set(l.id, l.kpi_id); });
    return m;
  }, [linesQ.data]);
  const kpiById = useMemo(
    () => new Map((kpisQ.data ?? []).map((k) => [k.id, k])),
    [kpisQ.data],
  );

  const exceptions = useMemo(() => {
    if (!calc || bestBandKeys.size === 0) return [];
    return calc.lines.filter(
      (l) => l.ref_type === 'kpi' && l.status_key != null && !bestBandKeys.has(l.status_key),
    );
  }, [calc, bestBandKeys]);

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

  // ── Needs attention rows (one actionable inbox) ────────────────────────────
  const attentionRows: AttentionRow[] = useMemo(() => {
    const rows: AttentionRow[] = [];
    exceptions.forEach((line) => {
      const kpiId = kpiIdByLineId.get(line.line_id) ?? (typeof line.detail?.kpi_id === 'string' ? line.detail.kpi_id : undefined);
      const kpi = kpiId ? kpiById.get(kpiId) : undefined;
      rows.push({
        id: `exception-${line.line_id}`,
        type: 'Exception',
        title: kpi?.name ?? '—',
        context: activePeriod?.name ?? '—',
        due: null,
        meta: line.has_data ? `Score ${fmtScore(line.score)}` : null,
        bandKey: line.status_key,
        statusLabel: null,
        statusAppearance: 'default',
        nav: kpi?.slug ? () => navigate(Routes.strata.kpi(kpi.slug!)) : undefined,
      });
    });
    openDecisions.forEach((d) => {
      rows.push({
        id: `decision-${d.id}`,
        type: 'Decision',
        title: d.title,
        context: d.decision_key,
        due: d.due_date,
        meta: null,
        bandKey: null,
        statusLabel: 'Open',
        statusAppearance: 'inprogress',
        nav: () => navigate(Routes.strata.reviews()),
      });
    });
    openActions.forEach((a) => {
      rows.push({
        id: `action-${a.id}`,
        type: 'Action',
        title: a.title,
        context: a.action_key,
        due: a.due_date,
        meta: null,
        bandKey: null,
        statusLabel: a.status === 'in_progress' ? 'In progress' : 'Open',
        statusAppearance: a.status === 'in_progress' ? 'inprogress' : 'default',
        nav: () => navigate(Routes.strata.reviews()),
      });
    });
    pendingAttestations.forEach((a) => {
      const kpi = kpiById.get(a.kpi_id);
      rows.push({
        id: `attestation-${a.id}`,
        type: 'Attestation',
        title: kpi?.name ?? '—',
        context: activePeriod?.name ?? '—',
        due: null,
        meta: a.submitted_at ? `Submitted ${fmtDate(a.submitted_at)}` : null,
        bandKey: null,
        statusLabel: 'Pending validation',
        statusAppearance: 'moved',
        nav: () => navigate(Routes.strata.data()),
      });
    });
    pendingAi.forEach((ai) => {
      rows.push({
        id: `advisory-${ai.id}`,
        type: 'Advisory',
        title: ai.content,
        context: labelize(ai.use_case),
        due: null,
        meta: ai.confidence != null ? `Confidence ${fmtRatioPct(ai.confidence)}` : null,
        bandKey: null,
        statusLabel: 'Pending review',
        statusAppearance: 'new',
        nav: () => navigate(Routes.strata.reviews()),
      });
    });
    return rows;
  }, [exceptions, openDecisions, openActions, pendingAttestations, pendingAi, kpiIdByLineId, kpiById, activePeriod, navigate]);

  // No silent failures: surface the first failing inbox source.
  const attentionError = [calcQ, schemesQ, decisionsQ, actionsQ, attestationsQ, aiQ]
    .map((q) => q.error)
    .find(Boolean);

  const attentionColumns: Column<AttentionRow>[] = useMemo(() => [
    {
      id: 'type', label: 'Type', width: 12,
      cell: ({ row }) => <Lozenge appearance={TYPE_LOZENGE[row.type]}>{row.type}</Lozenge>,
    },
    {
      id: 'title', label: 'Item', flex: true,
      cell: ({ row }) => (
        <span style={{
          fontSize: 'var(--ds-font-size-200)', color: T.text, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.title}
        </span>
      ),
    },
    {
      id: 'context', label: 'Context', width: 16,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
          {row.context}
        </span>
      ),
    },
    {
      id: 'due', label: 'Due / Meta', width: 16,
      cell: ({ row }) => row.due ? (
        <span style={{
          fontSize: 'var(--ds-font-size-100)',
          color: isOverdue(row.due) ? 'var(--ds-text-danger)' : T.subtlest,
          fontWeight: isOverdue(row.due) ? 600 : 400,
          whiteSpace: 'nowrap',
        }}>
          {fmtDate(row.due)}
        </span>
      ) : row.meta ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>{row.meta}</span>
      ) : (
        <span style={{ color: T.subtlest }}>—</span>
      ),
    },
    {
      id: 'status', label: 'Status / Band', width: 14,
      cell: ({ row }) => row.bandKey
        ? <StrataBandLozenge bandKey={row.bandKey} />
        : row.statusLabel
          ? <Lozenge appearance={row.statusAppearance}>{row.statusLabel}</Lozenge>
          : <span style={{ color: T.subtlest }}>—</span>,
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
      value: attestationsQ.data ? pendingAttestations.length : '—',
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
              count={attentionRows.length}
              noPadding={attentionRows.length > 0}
              testId="strata-cc-needs-attention"
            >
              {attentionError ? (
                <div style={{ padding: attentionRows.length > 0 ? 16 : 0 }}>
                  <PanelError error={attentionError} />
                </div>
              ) : null}
              {attentionRows.length === 0 ? (
                !attentionError ? (
                  <EmptyState
                    size="compact"
                    header="Nothing needs attention — all queues clear."
                    description="Exceptions, open decisions, actions, attestations and advisories land here."
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
        </div>
      )}
    </StrataPageShell>
  );
}
