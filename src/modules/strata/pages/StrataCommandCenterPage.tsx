/**
 * STRATA Executive Command Center (route /strata) — CAT-STRATA-20260705-001.
 *
 * One glance, no scrolling: enterprise score, value at risk, benefits
 * realization, open decisions, blocked dependencies, pending attestations —
 * plus perspective health, KPI exceptions, the decision queue and pending
 * AI advisory outputs.
 *
 * Every score/band/rollup on this page is server-calculated (strata_calc_*
 * RPCs or frozen snapshot payloads) — the UI only renders and counts rows.
 * Evidence drawers expose lineage (formula version, inputs, source runs,
 * confidence, snapshot state) on the executive tiles. ADS tokens only.
 *
 * D-012 executive lift (2026-07-05): flagship stat strip with score-ring
 * hero, icon-anchored panels with counts, band-toned micro-viz, per-panel
 * error degradation.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  AlertTriangle, Info, ListChecks, PieChart, Sparkles, Target, TrendingDown,
} from '@/lib/atlaskit-icons';
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
  useCalcValues,
} from '@/modules/strata/hooks/useStrata';
import {
  T,
  StrataPageChrome,
  StrataPanel,
  StrataStatStrip,
  StrataBandBar,
  StrataBandLozenge,
  useBandTone,
  useEvidenceDrawer,
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

/** "View evidence" caption affordance — explicit icon, no text glyphs. */
function EvidenceCaption() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Info size={12} />
      View evidence
    </span>
  );
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

/** Layout-matched loading skeleton: stat strip block + panel grid blocks. */
function LoadingSkeleton() {
  return (
    <div aria-hidden data-testid="strata-cc-loading">
      <div style={{ height: 92, borderRadius: 8, background: T.neutral, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 280, borderRadius: 8, background: T.neutral }} />
        ))}
      </div>
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

export default function StrataCommandCenterPage() {
  const navigate = useNavigate();
  const { activeCycle, activePeriod, isLoading: ctxLoading } = useStrataContext();
  const evidence = useEvidenceDrawer();
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
  const scorecardCalcValuesQ = useCalcValues(instance ? 'scorecard_instance' : undefined, instance?.id);

  // ── Value at risk (first portfolio) ────────────────────────────────────────
  const portfoliosQ = usePortfolios();
  const portfolio = portfoliosQ.data?.[0] ?? null;
  const varQ = useValueAtRisk(portfolio?.id);
  const portfolioCalcValuesQ = useCalcValues(portfolio ? 'portfolio' : undefined, portfolio?.id);

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
          caption: instance ? <EvidenceCaption /> : 'No scorecard for this period',
          onClick: instance ? () => evidence.open('Enterprise score', scorecardCalcValuesQ.data ?? []) : undefined,
          testId: 'strata-cc-enterprise-score',
        },
    {
      key: 'var',
      label: 'Value at risk',
      value: varQ.isError ? '—' : fmtSarCompact(varQ.data?.value),
      bandKey: varQ.data?.status_key,
      caption: varQ.isError ? 'Could not load' : portfolio ? <EvidenceCaption /> : 'No portfolio',
      captionTone: varQ.isError ? 'danger' : 'neutral',
      onClick: portfolio
        ? () => evidence.open('Value at risk', (portfolioCalcValuesQ.data && portfolioCalcValuesQ.data.length > 0)
            ? portfolioCalcValuesQ.data
            : (varQ.data ? [varQ.data] : []))
        : undefined,
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
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<Target size={20} />}
        title="Command Center"
        description="Enterprise strategy performance at a glance — every number is server-calculated and evidence-linked."
        modelLabel={instance?.name ?? null}
        state={dataState}
        testId="strata-cc-chrome"
      />

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
        <>
          {/* ── Executive stat strip ─────────────────────────────────────────── */}
          <StrataStatStrip items={stats} testId="strata-cc-hero" />

          {/* ── Panels ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
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

            <StrataPanel
              title="Exceptions"
              icon={<AlertTriangle size={16} />}
              count={calcQ.isError ? null : exceptions.length}
              testId="strata-cc-exceptions"
            >
              {calcQ.isError || schemesQ.isError ? (
                <PanelError error={calcQ.error ?? schemesQ.error} />
              ) : exceptions.length === 0 ? (
                <EmptyState size="compact" header="No exceptions" description="No KPI lines are outside the best band for this period." />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {exceptions.map((line) => {
                    const kpiId = kpiIdByLineId.get(line.line_id) ?? (typeof line.detail?.kpi_id === 'string' ? line.detail.kpi_id : undefined);
                    const kpi = kpiId ? kpiById.get(kpiId) : undefined;
                    return (
                      <ClickableRow
                        key={line.line_id}
                        onClick={kpi?.slug ? () => navigate(Routes.strata.kpi(kpi.slug!)) : undefined}
                        testId={`strata-cc-exception-${line.line_id}`}
                      >
                        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {kpi?.name ?? '—'}
                        </span>
                        {/* Below the scheme's best band by definition of this list */}
                        <span aria-hidden style={{ display: 'inline-flex', color: bandTone(line.status_key), flexShrink: 0 }}>
                          <TrendingDown size={16} />
                        </span>
                        <span style={{
                          fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text,
                          flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontFamily: T.fontDisplay,
                        }}>
                          {scoreText(line.score, line.has_data)}
                        </span>
                        <StrataBandLozenge bandKey={line.status_key} />
                      </ClickableRow>
                    );
                  })}
                </div>
              )}
            </StrataPanel>

            <StrataPanel
              title="Decision queue"
              icon={<ListChecks size={16} />}
              count={(decisionsQ.isError || actionsQ.isError) ? null : openDecisions.length + openActions.length}
              testId="strata-cc-decision-queue"
            >
              {(decisionsQ.isError || actionsQ.isError) ? (
                <PanelError error={decisionsQ.error ?? actionsQ.error} />
              ) : openDecisions.length === 0 && openActions.length === 0 ? (
                <EmptyState size="compact" header="Queue is clear" description="No open decisions or actions." />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {openDecisions.map((d) => (
                    <ClickableRow key={d.id} onClick={() => navigate(Routes.strata.reviews())} testId={`strata-cc-decision-${d.decision_key}`}>
                      <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.brandText, flexShrink: 0 }}>{d.decision_key}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.title}
                      </span>
                      <span style={{
                        fontSize: 'var(--ds-font-size-100)', flexShrink: 0,
                        color: isOverdue(d.due_date) ? 'var(--ds-text-danger)' : T.subtlest,
                        fontWeight: isOverdue(d.due_date) ? 600 : 400,
                      }}>
                        {fmtDate(d.due_date)}
                      </span>
                      <Lozenge appearance="inprogress">Open</Lozenge>
                    </ClickableRow>
                  ))}
                  {openActions.map((a) => (
                    <ClickableRow key={a.id} onClick={() => navigate(Routes.strata.reviews())} testId={`strata-cc-action-${a.action_key}`}>
                      <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.brandText, flexShrink: 0 }}>{a.action_key}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </span>
                      <span style={{
                        fontSize: 'var(--ds-font-size-100)', flexShrink: 0,
                        color: isOverdue(a.due_date) ? 'var(--ds-text-danger)' : T.subtlest,
                        fontWeight: isOverdue(a.due_date) ? 600 : 400,
                      }}>
                        {fmtDate(a.due_date)}
                      </span>
                      <Lozenge appearance={a.status === 'in_progress' ? 'inprogress' : 'default'}>
                        {a.status === 'in_progress' ? 'In progress' : 'Open'}
                      </Lozenge>
                    </ClickableRow>
                  ))}
                </div>
              )}
            </StrataPanel>

            <StrataPanel
              title="Advisory"
              icon={<Sparkles size={16} />}
              count={aiQ.isError ? null : pendingAi.length}
              testId="strata-cc-advisory"
            >
              {aiQ.isError ? (
                <PanelError error={aiQ.error} />
              ) : pendingAi.length === 0 ? (
                <EmptyState size="compact" header="No pending advisories" description="AI outputs appear here until a human reviews them." />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {pendingAi.map((ai) => (
                    <div key={ai.id} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-cc-advisory-${ai.id}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Lozenge appearance="new">Advisory</Lozenge>
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{labelize(ai.use_case)}</span>
                        {ai.confidence != null ? (
                          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                            Confidence {fmtRatioPct(ai.confidence)}
                          </span>
                        ) : null}
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginLeft: 'auto' }}>
                          Pending human review
                        </span>
                      </div>
                      <p style={{
                        margin: 0, fontSize: 'var(--ds-font-size-200)', color: T.text,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {ai.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </StrataPanel>
          </div>
        </>
      )}

      {evidence.drawer}
    </PageContainer>
  );
}
