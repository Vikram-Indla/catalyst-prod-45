/**
 * STRATA Portfolio Index (anchor 22 — "Portfolio Index").
 * Rendered by StrataPortfolioVmoPage's dispatcher for bare `/strata/portfolio`
 * (no ?portfolio= selection, no benefit slug) — CAT-STRATA-IMPL-20260712-001, slice 3B-3.
 *
 * Cross-portfolio value comparison: value-by-stage small multiples on ONE shared scale
 * (planned = 100% of the largest portfolio) make leakage concentration visible instantly;
 * the ranked-by-leakage table pairs the picture with exact figures + each portfolio's
 * weakest link. Row → anchor-08 portfolio detail.
 *
 * ZERO-ASSUMPTION: portfolio value aggregates are client-derived from each benefit's
 * strata_benefit_values (P3-D2 — no rollup RPC), same method as StrataPortfolioDetailPage.
 * A value kind absent from the data renders '—'. "Validated" is the realized value once
 * finance-validated (there is no `validated` value kind). Weakest link is client-derived
 * (max-leakage benefit, else lowest-confidence) — no server RPC exists for it.
 */
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Button, EmptyState, SectionMessage, Spinner } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { valueApi } from '@/modules/strata/domain';
import { StrataPageShell, StrataPanel, StrataValueBar, T } from '@/modules/strata/components/shared';
import { VMO_AUTHOR_ROLES } from '@/modules/strata/components/vmoAuthoring';
import { fmtRatioPct, fmtSarCompact } from '@/modules/strata/components/format';
import {
  useBenefits, useGateInstances, usePortfolios, useProfileNames, useStrataContext, useStrataRoles,
} from '@/modules/strata/hooks/useStrata';
import type { StrataBenefit, StrataBenefitValue, StrataPortfolio } from '@/modules/strata/types';

type ValueKind = StrataBenefitValue['value_kind'];

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em',
};
const numStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)', color: T.text, fontVariantNumeric: 'tabular-nums',
};

const sumKind = (values: StrataBenefitValue[], periodId: string, kind: ValueKind): number | null => {
  const rows = values.filter((v) => v.period_id === periodId && v.value_kind === kind);
  return rows.length ? rows.reduce((s, v) => s + v.value, 0) : null;
};

interface BenefitSnapshot {
  benefit: StrataBenefit;
  planned: number | null;
  forecast: number | null;
  realized: number | null;
  validated: number | null;
  leakage: number | null;
}
interface PortfolioAgg {
  portfolio: StrataPortfolio;
  planned: number | null;
  forecast: number | null;
  realized: number | null;
  validated: number | null;
  leakage: number | null;
  benefitCount: number;
  ownerName: string | null;
  weakest: { name: string; detail: string } | null;
}

export default function StrataPortfolioIndexView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const { activePeriod, periods } = useStrataContext();

  const portfoliosQ = usePortfolios();
  const allBenefitsQ = useBenefits(); // no portfolioId → every benefit (carries portfolio_id)
  const profilesQ = useProfileNames();
  const gatesQ = useGateInstances();
  const rolesQ = useStrataRoles();

  const portfolios = portfoliosQ.data ?? [];
  const allBenefits = useMemo(() => allBenefitsQ.data ?? [], [allBenefitsQ.data]);
  const roles = rolesQ.data ?? [];
  const canAuthor = roles.some((r) => (VMO_AUTHOR_ROLES as readonly string[]).includes(r));

  // One benefit-values query per benefit (deduped by react-query with the detail page's keys).
  const valueQueries = useQueries({
    queries: allBenefits.map((b) => ({
      queryKey: ['strata', 'benefit-values', b.id],
      queryFn: () => valueApi.benefitValues(b.id),
      enabled: allBenefits.length > 0,
      staleTime: 30_000,
    })),
  });
  const valuesLoading = valueQueries.some((q) => q.isLoading);

  // active period when the benefit carries values there, else its latest period with data.
  const pickPeriodId = (values: StrataBenefitValue[]): string | null => {
    const withData = new Set(values.map((v) => v.period_id));
    if (activePeriod && withData.has(activePeriod.id)) return activePeriod.id;
    for (let i = periods.length - 1; i >= 0; i -= 1) {
      if (withData.has(periods[i].id)) return periods[i].id;
    }
    return values[0]?.period_id ?? null;
  };

  const valuesByBenefit = new Map<string, StrataBenefitValue[]>();
  allBenefits.forEach((b, i) => valuesByBenefit.set(b.id, valueQueries[i]?.data ?? []));

  const snapshot = (benefit: StrataBenefit): BenefitSnapshot => {
    const values = valuesByBenefit.get(benefit.id) ?? [];
    const pid = pickPeriodId(values);
    const planned = pid ? sumKind(values, pid, 'planned') : null;
    const forecast = pid ? sumKind(values, pid, 'forecast') : null;
    const realized = pid ? sumKind(values, pid, 'realized') : null;
    const validatedRows = pid
      ? values.filter((v) => v.period_id === pid && v.value_kind === 'realized' && v.validation_status === 'validated')
      : [];
    const validated = validatedRows.length ? validatedRows.reduce((s, v) => s + v.value, 0) : null;
    return {
      benefit,
      planned,
      forecast,
      realized,
      validated,
      leakage: planned != null && forecast != null && forecast < planned ? planned - forecast : null,
    };
  };

  const sumOrNull = (xs: (number | null)[]): number | null => {
    const nums = xs.filter((x): x is number => x != null);
    return nums.length ? nums.reduce((s, x) => s + x, 0) : null;
  };

  const aggregates: PortfolioAgg[] = portfolios.map((portfolio) => {
    const snaps = allBenefits.filter((b) => b.portfolio_id === portfolio.id).map(snapshot);
    const planned = sumOrNull(snaps.map((s) => s.planned));
    const forecast = sumOrNull(snaps.map((s) => s.forecast));
    const realized = sumOrNull(snaps.map((s) => s.realized));
    const validated = sumOrNull(snaps.map((s) => s.validated));
    const leakage = planned != null && forecast != null && forecast < planned ? planned - forecast : null;
    // Weakest link: the benefit bleeding the most vs plan; else the lowest-confidence benefit.
    let weakest: PortfolioAgg['weakest'] = null;
    const byLeak = snaps.filter((s) => s.leakage != null && s.leakage > 0).sort((a, b) => (b.leakage ?? 0) - (a.leakage ?? 0));
    if (byLeak.length) {
      weakest = { name: byLeak[0].benefit.name, detail: `−${fmtSarCompact(byLeak[0].leakage)}` };
    } else {
      const byConf = snaps
        .filter((s) => s.benefit.confidence != null)
        .sort((a, b) => (a.benefit.confidence ?? 1) - (b.benefit.confidence ?? 1));
      if (byConf.length) weakest = { name: byConf[0].benefit.name, detail: `confidence ${fmtRatioPct(byConf[0].benefit.confidence)}` };
    }
    return {
      portfolio,
      planned,
      forecast,
      realized,
      validated,
      leakage,
      benefitCount: snaps.length,
      ownerName: portfolio.owner_id ? profilesQ.data?.get(portfolio.owner_id)?.name ?? null : null,
      weakest,
    };
  });

  // Shared scale for the small multiples: the largest planned across portfolios.
  const globalScale = Math.max(0, ...aggregates.map((a) => a.planned ?? 0));
  const totalPlanned = sumOrNull(aggregates.map((a) => a.planned));
  const totalGap = aggregates.reduce((s, a) => s + (a.leakage ?? 0), 0);

  // Ranked worst-first by leakage (no-leakage portfolios sort last, then by name).
  const ranked = [...aggregates].sort((a, b) => {
    const la = a.leakage ?? -1; const lb = b.leakage ?? -1;
    if (la !== lb) return lb - la;
    return a.portfolio.name.localeCompare(b.portfolio.name);
  });

  const openGates = (gatesQ.data ?? []).filter(
    (g) => g.subject_type === 'benefit' && (g.status === 'open' || g.status === 'in_review'),
  ).length;

  // Grounded leakage-concentration sentence — composed only from real aggregates.
  const concentration = (() => {
    if (totalGap <= 0) return 'All portfolios are tracking on or above plan this period.';
    const top = ranked[0];
    if (!top || top.leakage == null) return '';
    const others = ranked.slice(1).filter((a) => a.leakage != null);
    const maxOther = others.length ? Math.max(...others.map((a) => a.leakage ?? 0)) : null;
    const tail = maxOther != null && maxOther > 0
      ? ` The remaining portfolios stay within ${fmtSarCompact(maxOther)} of plan.`
      : others.length ? ' The remaining portfolios are on or above plan.' : '';
    return `Enterprise leakage is concentrated: ${top.portfolio.name} accounts for ${fmtSarCompact(top.leakage)} of the ${fmtSarCompact(totalGap)} total gap.${tail}`;
  })();

  const money = (v: number | null, tone?: string, weight?: number): React.ReactNode => (
    <span style={{ ...numStyle, color: tone ?? T.subtle, fontWeight: weight }}>{v != null ? fmtSarCompact(v) : '—'}</span>
  );
  const columns: Column<PortfolioAgg>[] = [
    {
      id: 'portfolio', label: 'Portfolio', flex: true,
      cell: ({ row }) => (
        <span style={{ minWidth: 0, display: 'block' }}>
          <span style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
            color: row.portfolio.slug ? T.brandText : T.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
          }}>
            {row.portfolio.name}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
            {row.ownerName ?? '— no owner'} · {row.benefitCount} benefit{row.benefitCount === 1 ? '' : 's'}
          </span>
        </span>
      ),
    },
    { id: 'planned', label: 'Planned', width: 11, align: 'end', cell: ({ row }) => money(row.planned) },
    { id: 'forecast', label: 'Forecast', width: 11, align: 'end', cell: ({ row }) => money(row.forecast, T.text, 600) },
    {
      id: 'leakage', label: 'Leakage', width: 12, align: 'end',
      cell: ({ row }) => {
        if (row.leakage == null) return <span style={{ color: T.subtlest }}>—</span>;
        // The portfolio owning most of the enterprise gap reads danger; lesser gaps read warning.
        const dominant = totalGap > 0 && row.leakage / totalGap >= 0.5;
        return (
          <span style={{ ...numStyle, fontWeight: 700, color: dominant ? 'var(--ds-text-danger)' : 'var(--ds-text-warning)' }}>
            −{fmtSarCompact(row.leakage)}
          </span>
        );
      },
    },
    { id: 'validated', label: 'Validated', width: 11, align: 'end', cell: ({ row }) => money(row.validated) },
    {
      id: 'weakest', label: 'Weakest link', width: 20,
      cell: ({ row }) => (
        row.weakest
          ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{row.weakest.name} ({row.weakest.detail})</span>
          : <span style={{ color: T.subtlest }}>—</span>
      ),
    },
  ];

  const subtitle = `${portfolios.length} portfolio${portfolios.length === 1 ? '' : 's'}${
    totalPlanned != null ? ` · ${fmtSarCompact(totalPlanned)} planned value` : ''} · attribution rules v2`;
  const manageHref = `${Routes.strata.portfolio()}?portfolio=${portfolios[0] ? (portfolios[0].slug ?? portfolios[0].id) : 'all'}`;
  const headerActions = canAuthor ? (
    <Button appearance="default" spacing="compact" onClick={() => navigate(manageHref)} testId="strata-manage-portfolios">
      Manage portfolios
    </Button>
  ) : undefined;

  return (
    <StrataPageShell
      title="Portfolios"
      docTitle="Portfolios"
      headerActions={headerActions}
      state={activePeriod?.close_status === 'closed' ? 'locked' : 'live'}
      freshness={<span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>All values SAR, cumulative to period end</span>}
      testId="strata-portfolio-index-chrome"
    >
      {portfoliosQ.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading portfolios" />
        </div>
      ) : portfoliosQ.isError ? (
        <SectionMessage appearance="error" title="Could not load portfolios">
          <p>{(portfoliosQ.error as Error | null)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : portfolios.length === 0 ? (
        <EmptyState
          header="No portfolios yet"
          description="Create a value portfolio to track benefit realization and value at risk across the enterprise."
          primaryAction={canAuthor ? <Button appearance="primary" onClick={() => navigate(manageHref)}>Create a portfolio</Button> : undefined}
          testId="strata-portfolio-index-empty"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{subtitle}</div>

          {concentration ? (
            <p data-testid="strata-portfolio-concentration" style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', lineHeight: 1.5, color: T.text }}>
              {concentration}
            </p>
          ) : null}

          {/* Value by stage — small multiples on a shared scale (planned = 100%). */}
          <StrataPanel title="Value by stage" testId="strata-portfolio-small-multiples">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--ds-space-150)' }}>
              <span style={labelStyle}>SHARED SCALE · PLANNED = 100%</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                rows: planned → forecast (red = leakage) → validated
              </span>
            </div>
            {valuesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                {ranked.map((a) => (
                  <div key={a.portfolio.id} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.text, marginBottom: 'var(--ds-space-075)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.portfolio.name} · {a.planned != null ? fmtSarCompact(a.planned) : '—'}
                    </div>
                    {a.planned != null || a.forecast != null || a.realized != null ? (
                      <StrataValueBar
                        variant="multiple"
                        planned={a.planned}
                        forecast={a.forecast}
                        realized={a.realized}
                        validated={a.validated}
                        scaleOverride={globalScale}
                        periodName={activePeriod?.name}
                        testId={`strata-small-multiple-${a.portfolio.slug ?? a.portfolio.id}`}
                      />
                    ) : (
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>No claims yet</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </StrataPanel>

          {/* Ranked by leakage — exact figures + weakest link; row → portfolio detail. */}
          <StrataPanel
            title="Portfolios — ranked by leakage"
            count={portfolios.length}
            noPadding
            testId="strata-portfolio-ranked"
            actions={<span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Row → portfolio detail</span>}
          >
            {allBenefitsQ.isError ? (
              <div style={{ padding: 16 }}>
                <SectionMessage appearance="warning" title="Value figures unavailable">
                  <p>{(allBenefitsQ.error as Error | null)?.message ?? 'Benefit values could not be loaded; portfolios are listed without value figures.'}</p>
                </SectionMessage>
              </div>
            ) : null}
            <JiraTable<PortfolioAgg>
              columns={columns}
              data={ranked}
              getRowId={(a) => a.portfolio.id}
              onRowClick={(a) => { if (a.portfolio.slug) navigate(Routes.strata.portfolioDetail(a.portfolio.slug, from ?? undefined)); }}
              focusedRowId={ranked[0]?.leakage != null ? ranked[0].portfolio.id : undefined}
              ariaLabel="Portfolios ranked by leakage"
            />
          </StrataPanel>

          {/* Comparability — why the bars are directly comparable + exposure. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: 'var(--ds-space-150) var(--ds-space-200)',
            border: `1px solid ${T.border}`, borderRadius: 8, background: T.sunken,
            fontSize: 'var(--ds-font-size-100)', color: T.subtle,
          }}>
            <span style={{ ...labelStyle, fontSize: 'var(--ds-font-size-075)' }}>COMPARABILITY</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              All portfolios calculate under attribution rules v2 and the same value categories — the stage bars are
              directly comparable.{openGates > 0 ? ` ${openGates} open gate${openGates === 1 ? '' : 's'} still expose committed spend.` : ''}
            </span>
          </div>
        </div>
      )}
    </StrataPageShell>
  );
}
