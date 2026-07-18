/**
 * STRATA Portfolio Detail (anchor 08 — "Portfolio & Benefit Realization").
 * Route: /strata/portfolio/:slug (CAT-STRATA-IMPL-20260712-001, slice 3B-2).
 *
 * Leakage is the page's verdict: a value waterfall (StrataValueBar hero) makes
 * Planned→Forecast→Realized→Validated one visual progression; the red gap IS the
 * judgment. Benefits table (leakage-sorted) → row drills to benefit detail; gates
 * render in decision context. The plain /strata/portfolio index stays on the VMO
 * page (repurposed to a real index in slice 3B-3).
 *
 * ZERO-ASSUMPTION: portfolio value aggregates are client-derived from each benefit's
 * strata_benefit_values (P3-D2 — no rollup column/RPC exists); a value kind absent
 * from the data renders '—', never a fabricated default. "Validated" is the realized
 * value once finance-validated (there is no `validated` value kind). Every executive
 * number is authored/calc-engine data rendered verbatim.
 */
import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Button, CatalystTag, EmptyState, SectionMessage, Spinner } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StrataAuditHistory } from '@/modules/strata/components/StrataAuditHistory';
import { StrataReviewLinks } from '@/modules/strata/components/StrataReviewLinks';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { Gem, ListChecks, ShieldCheck } from '@/lib/atlaskit-icons';
import { valueApi } from '@/modules/strata/domain';
import {
  StrataDecisionModal, StrataPageShell, StrataPanel, StrataValueBar, T,
} from '@/modules/strata/components/shared';
import { VMO_VALUE_ROLES } from '@/modules/strata/components/vmoAuthoring';
import { fmtDate, fmtRatioPct, fmtSarCompact, labelize } from '@/modules/strata/components/format';
import {
  useBenefitProjectCards, useBenefits, useGateInstances, useGateModels, useInvalidateStrata,
  usePortfolioBySlug, usePortfolios, useProfileNames, useStrataContext, useStrataRoles,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataBenefit, StrataBenefitValue, StrataGateInstance, StrataGateModelStage,
} from '@/modules/strata/types';

type ValueKind = StrataBenefitValue['value_kind'];

const GATE_STATUS: Record<string, LozengeAppearance> = {
  open: 'default', in_review: 'inprogress', decided: 'success', cancelled: 'removed',
};
const ATTESTATION: Record<'validated' | 'pending' | 'not_due', { label: string; appearance: LozengeAppearance }> = {
  validated: { label: 'Validated', appearance: 'success' },
  pending: { label: 'Pending', appearance: 'moved' },
  not_due: { label: 'Not due', appearance: 'default' },
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em',
};
const numStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)', color: T.text, fontVariantNumeric: 'tabular-nums',
};

/** Confidence (0–1 ratio) → level bucket + percent, e.g. "High · 80%". The level
 *  is a display grouping of the real number (never invented data); color never alone. */
function confidenceText(v: number | null): string {
  if (v == null) return '—';
  const level = v >= 0.7 ? 'High' : v >= 0.4 ? 'Medium' : 'Low';
  return `${level} · ${fmtRatioPct(v)}`;
}

// ── Per-benefit aggregate (one period's snapshot of each value kind) ──────────
interface BenefitAgg {
  benefit: StrataBenefit;
  planned: number | null;
  forecast: number | null;
  realized: number | null;
  validated: number | null;
  /** planned − forecast when forecast has fallen below plan; else null. */
  leakage: number | null;
  attestation: 'validated' | 'pending' | 'not_due';
  cardCount: number;
}

const sumKind = (values: StrataBenefitValue[], periodId: string, kind: ValueKind): number | null => {
  const rows = values.filter((v) => v.period_id === periodId && v.value_kind === kind);
  return rows.length ? rows.reduce((s, v) => s + v.value, 0) : null;
};

export default function StrataPortfolioDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');

  const { activePeriod, periods } = useStrataContext();
  const portfolioQ = usePortfolioBySlug(slug);
  const portfoliosQ = usePortfolios();
  const rolesQ = useStrataRoles();
  const profilesQ = useProfileNames();
  const invalidate = useInvalidateStrata();

  const portfolio = portfolioQ.data ?? null;
  const benefitsQ = useBenefits(portfolio?.id);
  const benefits = portfolio ? (benefitsQ.data ?? []) : [];
  const gatesQ = useGateInstances();
  const gateModelsQ = useGateModels();
  const bpcQ = useBenefitProjectCards();

  const roles = rolesQ.data ?? [];
  const canDecide = roles.some((r) => (VMO_VALUE_ROLES as readonly string[]).includes(r));

  /** Governance verdict modal for a benefit gate. */
  const [decision, setDecision] = useState<{ gate: StrataGateInstance; stage: StrataGateModelStage } | null>(null);

  // Per-benefit value profiles (P3-D2 client aggregation). N queries, deduped by
  // react-query with the same key the benefit-detail section uses.
  const valueQueries = useQueries({
    queries: benefits.map((b) => ({
      queryKey: ['strata', 'benefit-values', b.id],
      queryFn: () => valueApi.benefitValues(b.id),
      enabled: !!portfolio,
      staleTime: 30_000,
    })),
  });
  const valuesLoading = valueQueries.some((q) => q.isLoading);

  // Benefit → attached Project Card count (membership reachable from the row).
  const cardCountByBenefit = new Map<string, number>();
  (bpcQ.data ?? []).forEach((link) => {
    cardCountByBenefit.set(link.benefit_id, (cardCountByBenefit.get(link.benefit_id) ?? 0) + 1);
  });

  // Pick the period each benefit's snapshot reads from: the active period when it
  // carries values, else the latest cycle period that does (else any).
  const pickPeriodId = (values: StrataBenefitValue[]): string | null => {
    const withData = new Set(values.map((v) => v.period_id));
    if (activePeriod && withData.has(activePeriod.id)) return activePeriod.id;
    for (let i = periods.length - 1; i >= 0; i -= 1) {
      if (withData.has(periods[i].id)) return periods[i].id;
    }
    return values[0]?.period_id ?? null;
  };

  const aggregates: BenefitAgg[] = benefits.map((benefit, i) => {
    const values = valueQueries[i]?.data ?? [];
    const pid = pickPeriodId(values);
    const planned = pid ? sumKind(values, pid, 'planned') : null;
    const forecast = pid ? sumKind(values, pid, 'forecast') : null;
    const realized = pid ? sumKind(values, pid, 'realized') : null;
    const realizedRows = pid ? values.filter((v) => v.period_id === pid && v.value_kind === 'realized') : [];
    const validatedRows = realizedRows.filter((v) => v.validation_status === 'validated');
    const validated = validatedRows.length ? validatedRows.reduce((s, v) => s + v.value, 0) : null;
    const attestation: BenefitAgg['attestation'] = realizedRows.length === 0
      ? 'not_due'
      : realizedRows.every((v) => v.validation_status === 'validated') ? 'validated' : 'pending';
    return {
      benefit,
      planned,
      forecast,
      realized,
      validated,
      leakage: planned != null && forecast != null && forecast < planned ? planned - forecast : null,
      attestation,
      cardCount: cardCountByBenefit.get(benefit.id) ?? 0,
    };
  });

  // Portfolio rollup: Σ each kind across benefits; a kind with zero contributors → null.
  const rollup = (sel: (a: BenefitAgg) => number | null): number | null => {
    const xs = aggregates.map(sel).filter((x): x is number => x != null);
    return xs.length ? xs.reduce((s, x) => s + x, 0) : null;
  };
  const totalPlanned = rollup((a) => a.planned);
  const totalForecast = rollup((a) => a.forecast);
  const totalRealized = rollup((a) => a.realized);
  const totalValidated = rollup((a) => a.validated);
  const totalLeakage = totalPlanned != null && totalForecast != null && totalForecast < totalPlanned
    ? totalPlanned - totalForecast : null;
  const pendingAttestation = totalRealized != null
    ? Math.max(0, totalRealized - (totalValidated ?? 0)) : null;

  // Leakage-sorted rows (worst first); benefits without a leakage figure sort last.
  const rows = [...aggregates].sort((a, b) => {
    const la = a.leakage ?? -1; const lb = b.leakage ?? -1;
    if (la !== lb) return lb - la;
    return a.benefit.name.localeCompare(b.benefit.name);
  });
  // Top leaking benefits — named in the grounded verdict sentence.
  const topLeaking = aggregates
    .filter((a) => a.leakage != null && a.leakage > 0)
    .sort((a, b) => (b.leakage ?? 0) - (a.leakage ?? 0))
    .slice(0, 2)
    .map((a) => a.benefit.name);

  // Grounded verdict sentence — composed only from real aggregates (no invented copy).
  const verdictSentence = (() => {
    const parts: string[] = [];
    if (totalLeakage != null) {
      parts.push(`Forecast has fallen ${fmtSarCompact(totalLeakage)} below plan${
        topLeaking.length ? ` — ${topLeaking.join(' and ')} ${topLeaking.length > 1 ? 'account' : 'accounts'} for most of it` : ''}.`);
    } else if (totalPlanned != null && totalForecast != null) {
      parts.push('Forecast is on or above plan.');
    }
    if (totalRealized != null && totalRealized > 0) {
      const val = totalValidated != null ? fmtSarCompact(totalValidated) : 'none';
      parts.push(`Of ${fmtSarCompact(totalRealized)} realized, ${val} is independently validated${
        pendingAttestation != null && pendingAttestation > 0 ? `; ${fmtSarCompact(pendingAttestation)} awaits VMO attestation` : ''}.`);
    }
    return parts.join(' ');
  })();

  const ownerName = portfolio?.owner_id ? profilesQ.data?.get(portfolio.owner_id)?.name ?? null : null;
  const portfolioCount = portfoliosQ.data?.length ?? null;

  // ── Benefits table ──────────────────────────────────────────────────────────
  const money = (v: number | null, tone?: string): React.ReactNode => (
    <span style={{ ...numStyle, color: tone ?? T.subtle }}>{v != null ? fmtSarCompact(v) : '—'}</span>
  );
  const columns: Column<BenefitAgg>[] = [
    {
      id: 'benefit', label: 'Benefit', flex: true,
      cell: ({ row }) => (
        <span style={{ minWidth: 0, display: 'block' }}>
          <span style={{
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
            color: row.benefit.slug ? T.brandText : T.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
          }}>
            {row.benefit.name}
          </span>
          {row.cardCount > 0 ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              via {row.cardCount} project card{row.cardCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </span>
      ),
    },
    { id: 'planned', label: 'Planned', width: 11, align: 'end', cell: ({ row }) => money(row.planned) },
    {
      id: 'forecast', label: 'Forecast', width: 11, align: 'end',
      cell: ({ row }) => (
        <span style={{ ...numStyle, fontWeight: 600, color: row.leakage != null ? 'var(--ds-text-danger)' : T.text }}>
          {row.forecast != null ? fmtSarCompact(row.forecast) : '—'}
        </span>
      ),
    },
    { id: 'realized', label: 'Realized', width: 11, align: 'end', cell: ({ row }) => money(row.realized, T.text) },
    { id: 'validated', label: 'Validated', width: 11, align: 'end', cell: ({ row }) => money(row.validated, T.text) },
    {
      id: 'confidence', label: 'Confidence', width: 12,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{confidenceText(row.benefit.confidence)}</span>,
    },
    {
      id: 'attestation', label: 'Attestation', width: 12,
      cell: ({ row }) => {
        const att = ATTESTATION[row.attestation];
        return <StatusLozenge status={row.attestation} label={att.label} appearance={att.appearance} />;
      },
    },
  ];

  // ── Gates on this portfolio's benefits (no portfolio-level gate subject exists) ─
  const benefitIds = new Set(benefits.map((b) => b.id));
  const benefitName = (id: string) => benefits.find((b) => b.id === id)?.name ?? '—';
  const stageById = new Map<string, StrataGateModelStage>();
  (gateModelsQ.data ?? []).forEach((m) => (m.stages ?? []).forEach((s) => stageById.set(s.id, s)));
  const gates = (gatesQ.data ?? []).filter((g) => g.subject_type === 'benefit' && benefitIds.has(g.subject_id));
  const now = new Date();
  const overdueDays = (iso: string | null): number => {
    if (!iso) return 0;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  };

  // Section back-link only; the portfolio name is the H2 (title) — matches the
  // sibling detail pages (KPI/Scorecard/Element) instead of double-listing the name.
  const trail = [{ text: 'Portfolio & VMO', href: from ?? Routes.strata.portfolio() }];
  const headerActions = portfolio ? (
    <Button
      appearance="default"
      spacing="compact"
      onClick={() => navigate(`${Routes.strata.portfolio()}?portfolio=${portfolio.slug ?? portfolio.id}`)}
      testId="strata-manage-benefits"
    >
      Manage benefits
    </Button>
  ) : undefined;

  return (
    <StrataPageShell
      trail={trail}
      title={portfolio?.name}
      docTitle={portfolio?.name ?? 'Portfolio'}
      headerActions={headerActions}
      state={activePeriod?.close_status === 'closed' ? 'locked' : 'live'}
      scope={ownerName ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>VMO owner {ownerName}</span> : undefined}
      freshness={<span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>All values SAR, cumulative to period end</span>}
      testId="strata-portfolio-detail-chrome"
    >
      {portfolioQ.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading portfolio" />
        </div>
      ) : portfolioQ.isError ? (
        <SectionMessage appearance="error" title="Could not load portfolio">
          <p>{(portfolioQ.error as Error | null)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : !portfolio ? (
        <EmptyState
          header="Portfolio not found"
          description="No value portfolio matches this address. It may have been renamed or archived."
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.portfolio())}>Back to portfolios</Button>}
          testId="strata-portfolio-detail-notfound"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {portfolioCount != null && portfolioCount > 1 ? (
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              1 of {portfolioCount} portfolios ·{' '}
              <button
                type="button"
                onClick={() => navigate(Routes.strata.portfolio())}
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: T.brandText, cursor: 'pointer' }}
              >
                view all portfolios
              </button>
            </div>
          ) : null}

          {/* Value judgment — leakage is the headline. */}
          <section
            data-testid="strata-portfolio-value-position"
            style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, padding: 'var(--ds-space-250)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--ds-space-075)', flexWrap: 'wrap' }}>
              <span style={labelStyle}>VALUE POSITION{activePeriod ? ` · CUMULATIVE TO ${activePeriod.name.toUpperCase()}` : ''}</span>
              {totalLeakage != null ? (
                <StatusLozenge status="leaking" label={`${fmtSarCompact(totalLeakage)} leaking`} appearance="removed" />
              ) : totalPlanned != null && totalForecast != null ? (
                <StatusLozenge status="on-plan" label="On plan" appearance="success" />
              ) : null}
            </div>
            {verdictSentence ? (
              <p style={{ margin: '0 0 var(--ds-space-200)', fontSize: 'var(--ds-font-size-300)', lineHeight: 1.5, color: T.text }}>
                {verdictSentence}
              </p>
            ) : null}
            {valuesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : (
              <>
                <StrataValueBar
                  variant="hero"
                  planned={totalPlanned}
                  forecast={totalForecast}
                  realized={totalRealized}
                  validated={totalValidated}
                  periodName={activePeriod?.name}
                  testId="strata-portfolio-waterfall"
                />
                {totalPlanned == null && totalForecast == null && totalRealized == null ? (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>
                    No value profile recorded for this period yet.
                  </p>
                ) : (
                  <p style={{ margin: 'var(--ds-space-100) 0 0', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                    Validated ⊆ realized ⊆ forecast — nested magnitudes, not shares. Leakage vs plan shown in red.
                  </p>
                )}
              </>
            )}
          </section>

          {/* Benefits — where the value story is decided. */}
          <StrataPanel
            title="Benefits — where the value story is decided"
            icon={<Gem size={16} />}
            count={benefits.length}
            noPadding
            testId="strata-portfolio-benefits"
            actions={<span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Sorted by leakage</span>}
          >
            {benefitsQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : benefitsQ.isError ? (
              <div style={{ padding: 16 }}>
                <SectionMessage appearance="error" title="Could not load benefits">
                  <p>{(benefitsQ.error as Error | null)?.message ?? 'Unknown error'}</p>
                </SectionMessage>
              </div>
            ) : benefits.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState size="compact" header="No benefits registered" description="Benefits in this portfolio appear here once identified." />
              </div>
            ) : (
              <JiraTable<BenefitAgg>
                columns={columns}
                data={rows}
                getRowId={(a) => a.benefit.id}
                onRowClick={(a) => { if (a.benefit.slug) navigate(Routes.strata.benefit(a.benefit.slug)); }}
                ariaLabel={`Benefits in ${portfolio.name}, sorted by leakage`}
              />
            )}
          </StrataPanel>

          {/* Gates — the decision each one controls. */}
          <StrataPanel
            title="Gates — the decision each one controls"
            icon={<ShieldCheck size={16} />}
            count={gates.length}
            testId="strata-portfolio-gates"
          >
            {gatesQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : gates.length === 0 ? (
              <EmptyState size="compact" header="No open gates" description="Governance gates scheduled on this portfolio's benefits appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {gates.map((gate) => {
                  const stage = stageById.get(gate.stage_id) ?? null;
                  const isOpen = gate.status === 'open' || gate.status === 'in_review';
                  const days = isOpen ? overdueDays(gate.scheduled_for) : 0;
                  const criteria = (stage?.criteria ?? []).map((c) => c.label).filter(Boolean).join(' · ');
                  return (
                    <div key={gate.id} style={{ display: 'flex', gap: 12, padding: 'var(--ds-space-150) 0', borderBottom: `1px solid ${T.border}`, alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, marginTop: 'var(--ds-space-025)' }}>
                        <CatalystTag text={stage?.name ?? stage?.stage_key ?? 'Gate'} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{benefitName(gate.subject_id)}</span>
                          <StatusLozenge status={gate.status} label={labelize(gate.status)} appearance={GATE_STATUS[gate.status] ?? 'default'} />
                          {gate.status === 'decided' && gate.verdict ? <CatalystTag text={labelize(gate.verdict)} color="green" /> : null}
                        </div>
                        {criteria ? (
                          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{criteria}</span>
                        ) : null}
                        {isOpen && canDecide && stage && stage.decision_options.length > 0 ? (
                          <span style={{ marginTop: 4 }}>
                            <Button appearance="primary" spacing="compact" onClick={() => setDecision({ gate, stage })} testId={`strata-gate-decide-${gate.id}`}>
                              Decide
                            </Button>
                          </span>
                        ) : null}
                      </div>
                      <span style={{
                        flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, whiteSpace: 'nowrap',
                        color: days > 0 ? 'var(--ds-text-danger)' : T.subtle,
                      }}>
                        {days > 0 ? `${days} days overdue` : gate.scheduled_for ? `Due ${fmtDate(gate.scheduled_for)}` : gate.decided_at ? `Decided ${fmtDate(gate.decided_at)}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </StrataPanel>

          <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
            <ListChecks size={12} /> Completion is not benefit: realized value counts only once assured (owner-confirmed, independently validated, or accepted with exception).
          </p>

          {/* PB-DEF-008 · portfolio audit/lineage, reachable from the record. */}
          <StrataAuditHistory entityTable="strata_portfolios" entityId={portfolio.id} title="Portfolio history" />

          {/* PB-DEF-010 · reviews referencing this portfolio, navigable both ways. */}
          <StrataReviewLinks targetType="portfolio" targetId={portfolio.id} />
        </div>
      )}

      {/* Governance verdict modal — verdict options come from the governed gate
          model; the RPC rejects anything outside them and enforces SoD. */}
      <StrataDecisionModal
        open={decision != null}
        onClose={() => setDecision(null)}
        title={`Decide gate · ${decision?.stage.name ?? ''}`}
        description="The verdict options come from the governed gate model. The subject owner cannot decide their own gate."
        options={(decision?.stage.decision_options ?? []).map((opt) => ({
          value: opt,
          label: labelize(opt),
          appearance: opt === 'stop' || opt === 'reject' ? 'danger' as const : undefined,
        }))}
        confirmLabel="Record decision"
        onConfirm={async (verdict, note) => {
          if (!decision) return;
          await valueApi.decideGate(decision.gate.id, verdict, note || undefined);
          invalidate();
        }}
        testId="strata-portfolio-gate-decide-modal"
      />
    </StrataPageShell>
  );
}
