/**
 * STRATA Portfolio / VMO page — benefit realization (CAT-STRATA-20260705-001).
 * Routes: /strata/portfolio and /strata/portfolio/benefits/:slug.
 *
 * Every executive number is server-calculated: Value at Risk and realization
 * indices come from strata_calculated_values (calc engine RPCs); the UI only
 * renders them with lineage (evidence drawer). Zero-assumption: '—' for unknowns.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { valueApi } from '@/modules/strata/domain';
import {
  StrataConfigContextBar, StrataMetricStat, StrataPanel, useEvidenceDrawer,
} from '@/modules/strata/components/shared';
import {
  useAssumptions, useBenefitRealization, useBenefits, useBenefitValues, useCalcValues,
  useGateInstances, useGateModels, usePortfolios, useStrataContext, useValueAtRisk,
  useValueCategories,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataAssumption, StrataBenefit, StrataBenefitValue, StrataGateInstance,
  StrataGateModelStage,
} from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

// ── System-state lozenge maps (mirror DB CHECK constraints) ──────────────────
const VALIDATION_STATUS: Record<StrataBenefitValue['validation_status'], LozengeAppearance> = {
  validated: 'success', pending: 'moved', rejected: 'removed',
};
const ASSUMPTION_STATUS: Record<StrataAssumption['status'], LozengeAppearance> = {
  holding: 'success', open: 'default', broken: 'removed', retired: 'default',
};
const GATE_STATUS: Record<StrataGateInstance['status'], LozengeAppearance> = {
  open: 'default', in_review: 'inprogress', decided: 'success', cancelled: 'removed',
};
const VALUE_KINDS: Array<StrataBenefitValue['value_kind']> = ['baseline', 'planned', 'forecast', 'realized'];

// ── Presentation helpers (display-only; no business math) ────────────────────
const sarCompact = (v: number | null | undefined): string =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en', { style: 'currency', currency: 'SAR', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const fmtDate = (d: string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const sentence = (s: string): string => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const pctOrDash = (v: number | null | undefined): string =>
  v == null ? '—' : `${(v * 100).toFixed(0)}%`;

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)', fontSize: 11, fontWeight: 600,
};
const captionStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text-subtlest)' };
const headerCell: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest)',
};
const cell: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' };

interface AttributionRuleRow { id: string; rule_type: string; definition: unknown }

// ── Benefit register realization cell (server-calculated index only) ─────────
function RealizationCell({ benefitId }: { benefitId: string }) {
  const realizationQ = useBenefitRealization(benefitId);
  if (realizationQ.isLoading) return <Spinner size="small" />;
  const index = realizationQ.data?.value ?? null;
  return <span style={cell}>{index == null ? '—' : `${(index * 100).toFixed(0)}%`}</span>;
}

// ── Benefit detail section (own hooks; mounted only when a benefit exists) ───
function BenefitDetailSection({ benefit }: { benefit: StrataBenefit }) {
  const { periods } = useStrataContext();
  const valuesQ = useBenefitValues(benefit.id);
  const assumptionsQ = useAssumptions(benefit.id);
  const gatesQ = useGateInstances();
  const gateModelsQ = useGateModels();
  const attributionQ = useQuery({
    queryKey: ['strata', 'attribution-rules', benefit.id],
    queryFn: () => valueApi.attributionRules(benefit.id),
    staleTime: 30_000,
  });

  const values = valuesQ.data ?? [];
  const assumptions = assumptionsQ.data ?? [];
  const attributionRules = (attributionQ.data ?? []) as AttributionRuleRow[];
  const gates = (gatesQ.data ?? []).filter((g) => g.subject_type === 'benefit' && g.subject_id === benefit.id);

  const stageById = new Map<string, StrataGateModelStage>();
  (gateModelsQ.data ?? []).forEach((m) => (m.stages ?? []).forEach((s) => stageById.set(s.id, s)));

  // Group values by period; preserve context period order, unknown periods last.
  const byPeriod = new Map<string, StrataBenefitValue[]>();
  values.forEach((v) => {
    const list = byPeriod.get(v.period_id) ?? [];
    list.push(v);
    byPeriod.set(v.period_id, list);
  });
  const knownPeriodIds = periods.filter((p) => byPeriod.has(p.id)).map((p) => p.id);
  const unknownPeriodIds = Array.from(byPeriod.keys()).filter((id) => !knownPeriodIds.includes(id));
  const orderedPeriodIds = [...knownPeriodIds, ...unknownPeriodIds];
  const periodName = (id: string) => periods.find((p) => p.id === id)?.name ?? '—';

  const profileCols = 'minmax(100px, 1fr) repeat(4, minmax(130px, 1fr))';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }} data-testid="strata-benefit-detail">
      <StrataPanel title={<>Value profile — {benefit.name}</>} testId="strata-value-profile">
        {valuesQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : valuesQ.isError ? (
          <SectionMessage appearance="error" title="Could not load value profile">
            <p>{(valuesQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : values.length === 0 ? (
          <EmptyState size="compact" header="No values recorded" description="Baseline, planned, forecast and realized values appear here per period." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 720 }}>
              <div style={{ display: 'grid', gridTemplateColumns: profileCols, gap: 8, padding: '4px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <span style={headerCell}>Period</span>
                {VALUE_KINDS.map((k) => <span key={k} style={headerCell}>{sentence(k)}</span>)}
              </div>
              {orderedPeriodIds.map((pid) => {
                const rows = byPeriod.get(pid) ?? [];
                return (
                  <div key={pid} style={{ display: 'grid', gridTemplateColumns: profileCols, gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border)', alignItems: 'center' }}>
                    <span style={{ ...cell, fontWeight: 600 }}>{periodName(pid)}</span>
                    {VALUE_KINDS.map((kind) => {
                      const v = rows.find((r) => r.value_kind === kind);
                      if (!v) return <span key={kind} style={cell}>—</span>;
                      return (
                        <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={cell}>{v.value.toLocaleString()}{benefit.unit ? ` ${benefit.unit}` : ''}</span>
                          <Lozenge appearance={VALIDATION_STATUS[v.validation_status] ?? 'default'}>
                            {sentence(v.validation_status)}
                          </Lozenge>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p style={{ ...captionStyle, marginTop: 8 }}>
              Realized value requires finance validation (segregation of duties enforced in DB).
            </p>
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Value thesis" testId="strata-value-thesis">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ ...headerCell, marginBottom: 4 }}>Value hypothesis</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)' }}>{benefit.value_hypothesis ?? '—'}</p>
          </div>
          <div>
            <div style={{ ...headerCell, marginBottom: 4 }}>Causal mechanism</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)' }}>{benefit.causal_mechanism ?? '—'}</p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={captionStyle}>Unit: <strong style={{ color: 'var(--ds-text)' }}>{benefit.unit ?? '—'}</strong></span>
            <span style={captionStyle}>Confidence: <strong style={{ color: 'var(--ds-text)' }}>{pctOrDash(benefit.confidence)}</strong></span>
          </div>
        </div>
      </StrataPanel>

      <StrataPanel title="Assumptions" testId="strata-assumptions">
        {assumptionsQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : assumptionsQ.isError ? (
          <SectionMessage appearance="error" title="Could not load assumptions">
            <p>{(assumptionsQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : assumptions.length === 0 ? (
          <EmptyState size="compact" header="No assumptions" description="Assumptions underpinning this benefit appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {assumptions.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <span style={{ ...cell, flex: 1, fontSize: 13 }}>{a.description}</span>
                <span style={{ ...cell, flexShrink: 0 }}>{pctOrDash(a.confidence)}</span>
                <Lozenge appearance={ASSUMPTION_STATUS[a.status] ?? 'default'}>{sentence(a.status)}</Lozenge>
              </div>
            ))}
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Attribution" testId="strata-attribution">
        {attributionQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : attributionQ.isError ? (
          <SectionMessage appearance="error" title="Could not load attribution rules">
            <p>{(attributionQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : attributionRules.length === 0 ? (
          <EmptyState size="compact" header="No attribution rules" description="Rules that attribute realized value to initiatives appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attributionRules.map((rule) => (
              <div key={rule.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...chipStyle, alignSelf: 'flex-start' }}>{sentence(rule.rule_type)}</span>
                <pre
                  style={{
                    margin: 0, padding: 12, borderRadius: 8, background: 'var(--ds-surface-sunken)',
                    fontSize: 12, color: 'var(--ds-text)', overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(rule.definition, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Gates" testId="strata-benefit-gates">
        {gatesQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : gatesQ.isError ? (
          <SectionMessage appearance="error" title="Could not load gates">
            <p>{(gatesQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : gates.length === 0 ? (
          <EmptyState size="compact" header="No gates" description="Governance gates scheduled for this benefit appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gates.map((gate) => {
              const stage = stageById.get(gate.stage_id) ?? null;
              const isOpen = gate.status === 'open' || gate.status === 'in_review';
              return (
                <div key={gate.id} style={{ border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13, color: 'var(--ds-text)' }}>{stage?.name ?? '—'}</strong>
                    <Lozenge appearance={GATE_STATUS[gate.status] ?? 'default'}>{sentence(gate.status)}</Lozenge>
                    {gate.status === 'decided' && gate.verdict ? <span style={chipStyle}>{sentence(gate.verdict)}</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={captionStyle}>Scheduled {fmtDate(gate.scheduled_for)}</span>
                    <span style={captionStyle}>Decided {fmtDate(gate.decided_at)}</span>
                  </div>
                  {isOpen && stage && stage.decision_options.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {stage.decision_options.map((opt) => (
                          <Button key={opt} isDisabled spacing="compact">{sentence(opt)}</Button>
                        ))}
                      </div>
                      <span style={captionStyle}>
                        Gate decisions require configured approval roles — decided via governed RPC.
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </StrataPanel>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataPortfolioVmoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const portfoliosQ = usePortfolios();
  const portfolio = portfoliosQ.data?.[0] ?? null;

  const benefitsQ = useBenefits(portfolio?.id);
  const categoriesQ = useValueCategories();
  const gatesQ = useGateInstances();
  const varQ = useValueAtRisk(portfolio?.id);
  const calcValuesQ = useCalcValues(portfolio ? 'portfolio' : undefined, portfolio?.id);
  const evidence = useEvidenceDrawer();

  const benefits = portfolio ? (benefitsQ.data ?? []) : [];
  const categories = categoriesQ.data ?? [];
  const openGates = (gatesQ.data ?? []).filter((g) => g.status === 'open' || g.status === 'in_review');

  const selectedBenefit: StrataBenefit | null =
    (slug ? benefits.find((b) => b.slug === slug) : undefined) ?? benefits[0] ?? null;

  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? '—' : '—');

  const isLoading = portfoliosQ.isLoading;
  const isError = portfoliosQ.isError || benefitsQ.isError;
  const errorMessage =
    (portfoliosQ.error as Error | null)?.message ?? (benefitsQ.error as Error | null)?.message ?? 'Unknown error';

  const registerCols = 'minmax(180px, 2fr) minmax(120px, 1.2fr) 130px 100px 130px 80px';

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 4px' }}>Portfolio / VMO</h1>
      <p style={{ ...captionStyle, margin: '0 0 8px' }}>{portfolio?.name ?? '—'}</p>
      <StrataConfigContextBar />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading portfolio" />
        </div>
      ) : isError ? (
        <SectionMessage appearance="error" title="Could not load portfolio data">
          <p>{errorMessage}</p>
        </SectionMessage>
      ) : !portfolio ? (
        <EmptyState
          header="No portfolio yet"
          description="Create a value portfolio to track benefit realization and value at risk."
          testId="strata-portfolio-empty"
        />
      ) : (
        <>
          {/* Hero metric row */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}
            data-testid="strata-portfolio-hero"
          >
            <StrataMetricStat label="Value target" value={sarCompact(portfolio.value_target)} testId="strata-stat-value-target" />
            <StrataMetricStat
              label="Value at Risk"
              value={varQ.isLoading ? <Spinner size="small" /> : sarCompact(varQ.data?.value)}
              caption="ⓘ Server-calculated — click for evidence"
              onClick={() => evidence.open('Value at Risk', calcValuesQ.data ?? [])}
              testId="strata-stat-var"
            />
            <StrataMetricStat label="Benefits" value={benefitsQ.isLoading ? <Spinner size="small" /> : benefits.length} testId="strata-stat-benefits" />
            <StrataMetricStat label="Open gates" value={gatesQ.isLoading ? <Spinner size="small" /> : openGates.length} testId="strata-stat-open-gates" />
          </div>

          {/* Benefit register */}
          <StrataPanel title="Benefit register" testId="strata-benefit-register">
            {benefitsQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : benefits.length === 0 ? (
              <EmptyState size="compact" header="No benefits registered" description="Benefits in this portfolio appear here once identified." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 860 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: registerCols, gap: 8, padding: '4px 0', borderBottom: '1px solid var(--ds-border)' }}>
                    <span style={headerCell}>Benefit</span>
                    <span style={headerCell}>Category</span>
                    <span style={headerCell}>Lifecycle stage</span>
                    <span style={headerCell}>Confidence</span>
                    <span style={headerCell}>Realization index</span>
                    <span style={headerCell}>Validator</span>
                  </div>
                  {benefits.map((b) => (
                    <div key={b.id} style={{ display: 'grid', gridTemplateColumns: registerCols, gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border)', alignItems: 'center' }}>
                      <span style={{ minWidth: 0 }}>
                        <Button
                          appearance="subtle"
                          spacing="compact"
                          isDisabled={!b.slug}
                          onClick={() => { if (b.slug) navigate(Routes.strata.benefit(b.slug)); }}
                        >
                          {b.name}
                        </Button>
                      </span>
                      <span style={cell}>{categoryName(b.category_id)}</span>
                      <span><span style={chipStyle}>{sentence(b.lifecycle_stage)}</span></span>
                      <span style={cell}>{pctOrDash(b.confidence)}</span>
                      <RealizationCell benefitId={b.id} />
                      <span style={cell}>{b.validator_id ? 'Set' : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </StrataPanel>

          {/* Benefit detail */}
          {selectedBenefit ? <BenefitDetailSection benefit={selectedBenefit} /> : null}

          {evidence.drawer}
        </>
      )}
    </PageContainer>
  );
}
