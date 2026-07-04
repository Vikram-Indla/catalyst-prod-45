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
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
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
  StrataConfigContextBar,
  StrataPanel,
  StrataMetricStat,
  StrataBandLozenge,
  useEvidenceDrawer,
} from '@/modules/strata/components/shared';
import type { ScorecardCalcResult, ThresholdBand } from '@/modules/strata/types';

const T = {
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  border: 'var(--ds-border)',
  neutral: 'var(--ds-background-neutral)',
  brandBold: 'var(--ds-background-brand-bold)',
};

/** Display-only score formatting — the value itself comes from the calc engine. */
function fmtScore(score: number | null | undefined, hasData: boolean | undefined): string {
  if (hasData === false || score == null) return '—';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function fmtSarCompact(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

function ClickableRow({ onClick, children, testId }: { onClick?: () => void; children: React.ReactNode; testId?: string }) {
  const clickable = !!onClick;
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      data-testid={testId}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px',
        borderBottom: `1px solid ${T.border}`, cursor: clickable ? 'pointer' : 'default', minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function SkeletonRow({ height = 96 }: { height?: number }) {
  return <div aria-hidden style={{ height, borderRadius: 8, background: T.neutral }} />;
}

export default function StrataCommandCenterPage() {
  const navigate = useNavigate();
  const { activeCycle, activePeriod, isLoading: ctxLoading } = useStrataContext();
  const evidence = useEvidenceDrawer();

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
  const loadError = [instancesQ, calcQ, portfoliosQ, varQ, benefitsQ, realizationQ, decisionsQ, actionsQ, dependenciesQ, attestationsQ, aiQ]
    .map((q) => q.error)
    .find(Boolean) as Error | undefined;
  const isLoading = ctxLoading || instancesQ.isLoading || (!!instance && calcQ.isLoading);
  const dataState = instance ? (instance.status === 'locked' ? 'locked' : 'live') : null;

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>
        Command Center
      </h1>
      <StrataConfigContextBar modelLabel={instance?.name ?? null} state={dataState} />

      {loadError ? (
        <SectionMessage appearance="error" title="Could not load command center data">
          <p>{loadError.message}</p>
        </SectionMessage>
      ) : isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : !activeCycle ? (
        <EmptyState
          size="compact"
          header="No strategy cycles yet"
          description="Create a strategy cycle in STRATA admin to activate the command center."
          testId="strata-cc-empty"
        />
      ) : (
        <>
          {/* ── Hero metric row ─────────────────────────────────────────────── */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}
            data-testid="strata-cc-hero"
          >
            <StrataMetricStat
              label="Enterprise score"
              value={fmtScore(calc?.score, calc?.has_data)}
              bandKey={calc?.has_data ? calc?.status_key : null}
              caption={instance ? `${instance.name} · evidence ⓘ` : 'No scorecard for this period'}
              onClick={instance ? () => evidence.open('Enterprise score', scorecardCalcValuesQ.data ?? []) : undefined}
              testId="strata-cc-enterprise-score"
            />
            <StrataMetricStat
              label="Value at risk"
              value={varQ.data?.value != null ? fmtSarCompact(varQ.data.value) : '—'}
              bandKey={varQ.data?.status_key}
              caption={portfolio ? `${portfolio.name} · evidence ⓘ` : 'No portfolio'}
              onClick={portfolio
                ? () => evidence.open('Value at risk', (portfolioCalcValuesQ.data && portfolioCalcValuesQ.data.length > 0)
                    ? portfolioCalcValuesQ.data
                    : (varQ.data ? [varQ.data] : []))
                : undefined}
              testId="strata-cc-var"
            />
            <StrataMetricStat
              label="Benefits realization"
              value={realizationQ.data?.value != null ? `${Math.round(realizationQ.data.value * 100)}%` : '—'}
              bandKey={realizationQ.data?.status_key}
              caption={topBenefit ? `Realized vs planned — ${topBenefit.name}` : 'No benefits registered'}
              testId="strata-cc-benefits"
            />
            <StrataMetricStat
              label="Open decisions"
              value={decisionsQ.data ? openDecisions.length : '—'}
              caption="Awaiting a decision forum"
              onClick={() => navigate(Routes.strata.reviews())}
              testId="strata-cc-open-decisions"
            />
            <StrataMetricStat
              label="Blocked dependencies"
              value={dependenciesQ.data ? blockedDeps.length : '—'}
              caption="Cross-initiative blockers"
              onClick={() => navigate(Routes.strata.execution())}
              testId="strata-cc-blocked-deps"
            />
            <StrataMetricStat
              label="Pending attestations"
              value={attestationsQ.data ? pendingAttestations.length : '—'}
              caption={activePeriod ? `KPI actuals in ${activePeriod.name}` : 'No active period'}
              onClick={() => navigate(Routes.strata.data())}
              testId="strata-cc-pending-attestations"
            />
          </div>

          {/* ── Panels ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            <StrataPanel title="Perspective health" testId="strata-cc-perspectives">
              {!calc || calc.perspectives.length === 0 ? (
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 11, color: T.subtlest }}>w {p.weight}</span>
                      </div>
                      <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: T.neutral, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%', borderRadius: 2, background: T.brandBold,
                            width: p.has_data ? `${Math.max(0, Math.min(100, p.score))}%` : 0,
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flexShrink: 0 }}>
                      {fmtScore(p.score, p.has_data)}
                    </span>
                    <StrataBandLozenge bandKey={p.has_data ? p.status_key : null} />
                  </ClickableRow>
                ))
              )}
            </StrataPanel>

            <StrataPanel title="Exceptions" testId="strata-cc-exceptions">
              {exceptions.length === 0 ? (
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
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {kpi?.name ?? '—'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flexShrink: 0 }}>
                          {fmtScore(line.score, line.has_data)}
                        </span>
                        <StrataBandLozenge bandKey={line.status_key} />
                      </ClickableRow>
                    );
                  })}
                </div>
              )}
            </StrataPanel>

            <StrataPanel title="Decision queue" testId="strata-cc-decision-queue">
              {openDecisions.length === 0 && openActions.length === 0 ? (
                <EmptyState size="compact" header="Queue is clear" description="No open decisions or actions." />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {openDecisions.map((d) => (
                    <ClickableRow key={d.id} onClick={() => navigate(Routes.strata.reviews())} testId={`strata-cc-decision-${d.decision_key}`}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{d.decision_key}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.title}
                      </span>
                      <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{fmtDate(d.due_date)}</span>
                      <Lozenge appearance="inprogress">Open</Lozenge>
                    </ClickableRow>
                  ))}
                  {openActions.map((a) => (
                    <ClickableRow key={a.id} onClick={() => navigate(Routes.strata.reviews())} testId={`strata-cc-action-${a.action_key}`}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle, flexShrink: 0 }}>{a.action_key}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </span>
                      <span style={{ fontSize: 12, color: T.subtlest, flexShrink: 0 }}>{fmtDate(a.due_date)}</span>
                      <Lozenge appearance={a.status === 'in_progress' ? 'inprogress' : 'default'}>
                        {a.status === 'in_progress' ? 'In progress' : 'Open'}
                      </Lozenge>
                    </ClickableRow>
                  ))}
                </div>
              )}
            </StrataPanel>

            <StrataPanel title="Advisory" testId="strata-cc-advisory">
              {pendingAi.length === 0 ? (
                <EmptyState size="compact" header="No pending advisories" description="AI outputs appear here until a human reviews them." />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {pendingAi.map((ai) => (
                    <div key={ai.id} style={{ padding: '8px 4px', borderBottom: `1px solid ${T.border}` }} data-testid={`strata-cc-advisory-${ai.id}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Lozenge appearance="new">ADVISORY — pending human review</Lozenge>
                        <span style={{ fontSize: 12, color: T.subtle }}>{ai.use_case}</span>
                        {ai.confidence != null ? (
                          <span style={{ fontSize: 12, color: T.subtlest }}>confidence {ai.confidence}</span>
                        ) : null}
                      </div>
                      <p style={{
                        margin: 0, fontSize: 13, color: T.text,
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
