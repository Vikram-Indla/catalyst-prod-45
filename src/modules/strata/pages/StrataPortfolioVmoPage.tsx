/**
 * STRATA Portfolio / VMO page — benefit realization (CAT-STRATA-20260705-001).
 * Routes: /strata/portfolio and /strata/portfolio/benefits/:slug.
 *
 * Every executive number is server-calculated: Value at Risk and realization
 * indices come from strata_calculated_values (calc engine RPCs); the UI only
 * renders them with lineage (evidence drawer). Zero-assumption: '—' for unknowns.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState,
  SectionMessage, Spinner, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  CheckCircle2, ChevronDown, FileBarChart, Gem, Info, ListChecks, ShieldCheck, Wallet,
} from '@/lib/atlaskit-icons';
import { valueApi } from '@/modules/strata/domain';
import { StrataChipMenu,
  StrataBandBar, StrataPageChrome, StrataPanel, StrataStatStrip, T, useEvidenceDrawer,
} from '@/modules/strata/components/shared';
import {
  fmtDate, fmtPct, fmtRatioPct, fmtSarCompact, fmtUnit, labelize,
} from '@/modules/strata/components/format';
import {
  useAssumptions, useBenefitRealization, useBenefits, useBenefitValues, useCalcValues,
  useGateInstances, useGateModels, usePortfolios, useProfileNames, useStrataContext,
  useValueAtRisk, useValueCategories,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataAssumption, StrataBenefit, StrataBenefitValue, StrataGateModelStage,
} from '@/modules/strata/types';

// ── System-state appearance maps (mirror DB CHECK constraints) ───────────────
const VALIDATION_STATUS: Record<StrataBenefitValue['validation_status'], LozengeAppearance> = {
  validated: 'success', pending: 'moved', rejected: 'removed',
};
const ASSUMPTION_STATUS: Record<StrataAssumption['status'], LozengeAppearance> = {
  holding: 'success', open: 'default', broken: 'removed', retired: 'default',
};
const GATE_STATUS: Record<string, LozengeAppearance> = {
  open: 'default', in_review: 'inprogress', decided: 'success', cancelled: 'removed',
};
const LIFECYCLE_STAGE: Record<string, LozengeAppearance> = {
  identified: 'default', qualified: 'default', approved: 'inprogress', baselined: 'inprogress',
  in_flight: 'inprogress', forecast_revised: 'moved', realized: 'success',
  finance_validated: 'success', closed: 'default',
};
const VALUE_KINDS: Array<StrataBenefitValue['value_kind']> = ['baseline', 'planned', 'forecast', 'realized'];

// ── Display-only helpers ──────────────────────────────────────────────────────
/** Confidence arrives either as ratio (0–1) or percent — format by scale. */
const fmtConfidence = (v: number | null | undefined): string => {
  if (v == null) return '—';
  return Number(v) <= 1 ? fmtRatioPct(v) : fmtPct(v);
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em',
};
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };

/** Definition-list row: label column + value. */
function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ ...labelStyle, width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ ...bodyStyle, minWidth: 0 }}>{children}</span>
    </div>
  );
}

interface AttributionRuleRow { id: string; rule_type: string; definition: unknown }
interface AttributionSplit { label: string; pct: number | null }

/** Defensive parse of an attribution rule definition into per-initiative splits.
 *  Unknown shapes → null (caller renders '—'). Display-only, no business math. */
function parseAttributionSplits(def: unknown): AttributionSplit[] | null {
  if (def == null || typeof def !== 'object') return null;
  const obj = def as Record<string, unknown>;
  const list = Array.isArray(def) ? def
    : Array.isArray(obj.splits) ? obj.splits
    : Array.isArray(obj.allocations) ? obj.allocations
    : null;
  if (list) {
    const rows = list.map((entry): AttributionSplit | null => {
      if (entry == null || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      const label =
        (typeof e.initiative_name === 'string' && e.initiative_name)
        || (typeof e.name === 'string' && e.name)
        || (typeof e.initiative_id === 'string' && `${e.initiative_id.slice(0, 8)}…`)
        || null;
      const pctRaw = e.pct ?? e.percent ?? e.share ?? e.weight ?? e.value;
      const pct = typeof pctRaw === 'number' && Number.isFinite(pctRaw) ? pctRaw : null;
      if (!label && pct == null) return null;
      return { label: label ?? '—', pct };
    }).filter((r): r is AttributionSplit => r != null);
    return rows.length > 0 ? rows : null;
  }
  // Flat map shape: { "<initiative>": 0.4, ... }
  const entries = Object.entries(obj).filter(([, v]) => typeof v === 'number');
  if (entries.length > 0) {
    return entries.map(([k, v]) => ({
      label: /^[0-9a-f-]{36}$/i.test(k) ? `${k.slice(0, 8)}…` : labelize(k),
      pct: v as number,
    }));
  }
  return null;
}

/** Split percentage: ratios (≤1) shown as ratio-percent, else percent. */
const fmtSplitPct = (v: number | null): string => (v == null ? '—' : v <= 1 ? fmtRatioPct(v) : fmtPct(v));

// ── Benefit register realization cell (server-calculated index only) ─────────
function RealizationCell({ benefitId }: { benefitId: string }) {
  const realizationQ = useBenefitRealization(benefitId);
  if (realizationQ.isLoading) return <Spinner size="small" />;
  const calc = realizationQ.data ?? null;
  const index = calc?.value ?? null;
  if (index == null) return <span style={{ color: T.subtlest }}>—</span>;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtRatioPct(index)}</span>
      <span style={{ maxWidth: 96 }}>
        <StrataBandBar value={index * 100} bandKey={calc?.status_key} height={4} />
      </span>
    </span>
  );
}

// ── Value profile row model (period × value kinds; frozen server values) ─────
interface ProfileRow {
  periodId: string;
  periodName: string;
  byKind: Partial<Record<StrataBenefitValue['value_kind'], StrataBenefitValue>>;
}

// ── Benefit detail section (own hooks; mounted only when a benefit exists) ───
function BenefitDetailSection({ benefit, isFirst }: { benefit: StrataBenefit; isFirst: boolean }) {
  const navigate = useNavigate();
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

  const profileRows: ProfileRow[] = orderedPeriodIds.map((pid) => {
    const byKind: ProfileRow['byKind'] = {};
    (byPeriod.get(pid) ?? []).forEach((v) => { byKind[v.value_kind] = v; });
    return { periodId: pid, periodName: periodName(pid), byKind };
  });

  const profileColumns: Column<ProfileRow>[] = [
    {
      id: 'period', label: 'Period', flex: true,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.periodName}</span>,
    },
    ...VALUE_KINDS.map((kind): Column<ProfileRow> => ({
      id: kind, label: labelize(kind), width: 19,
      cell: ({ row }) => {
        const v = row.byKind[kind];
        if (!v) return <span style={{ color: T.subtlest }}>—</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(v.value, benefit.unit)}</span>
            {v.validation_status !== 'validated' ? (
              <StatusLozenge
                status={v.validation_status}
                label={labelize(v.validation_status)}
                appearance={VALIDATION_STATUS[v.validation_status] ?? 'default'}
              />
            ) : null}
          </span>
        );
      },
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }} data-testid="strata-benefit-detail">
      {/* Selected-benefit header — makes the register→detail link explicit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={labelStyle}>Showing</span>
        <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{benefit.name}</span>
        <StatusLozenge
          status={benefit.lifecycle_stage}
          label={labelize(benefit.lifecycle_stage)}
          appearance={LIFECYCLE_STAGE[benefit.lifecycle_stage] ?? 'default'}
        />
        {!isFirst ? (
          <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.portfolio())}>
            Back to first benefit
          </Button>
        ) : null}
      </div>

      <StrataPanel title="Value profile" icon={<FileBarChart size={16} />} count={values.length} noPadding testId="strata-value-profile">
        {valuesQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : valuesQ.isError ? (
          <div style={{ padding: 16 }}>
            <SectionMessage appearance="error" title="Could not load value profile">
              <p>{(valuesQ.error as Error | null)?.message ?? 'Unknown error'}</p>
            </SectionMessage>
          </div>
        ) : values.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState size="compact" header="No values recorded" description="Baseline, planned, forecast and realized values appear here per period." />
          </div>
        ) : (
          <>
            <JiraTable<ProfileRow>
              columns={profileColumns}
              data={profileRows}
              getRowId={(r) => r.periodId}
              showRowCount={false}
              ariaLabel={`Value profile for ${benefit.name}`}
            />
            <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: 0, padding: '8px 16px 12px' }}>
              Realized values require independent finance validation.
            </p>
          </>
        )}
      </StrataPanel>

      <StrataPanel title="Value thesis" icon={<Gem size={16} />} testId="strata-value-thesis">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <blockquote style={{
            margin: 0, padding: '4px 0 4px 12px', borderLeft: `2px solid ${T.border}`,
            fontSize: 'var(--ds-font-size-300)', color: T.text, lineHeight: 1.5,
          }}>
            {benefit.value_hypothesis ?? '—'}
          </blockquote>
          {benefit.causal_mechanism ? (
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
              {benefit.causal_mechanism}
            </p>
          ) : null}
          <div>
            <DefRow label="Unit">{benefit.unit ?? '—'}</DefRow>
            <DefRow label="Confidence">{fmtConfidence(benefit.confidence)}</DefRow>
          </div>
        </div>
      </StrataPanel>

      <StrataPanel title="Assumptions" icon={<ListChecks size={16} />} count={assumptions.length} testId="strata-assumptions">
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
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ ...bodyStyle, flex: 1, minWidth: 0 }}>{a.description}</span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {a.confidence != null ? `Confidence ${fmtConfidence(a.confidence)}` : null}
                </span>
                <StatusLozenge
                  status={a.status}
                  label={labelize(a.status)}
                  appearance={ASSUMPTION_STATUS[a.status] ?? 'default'}
                />
              </div>
            ))}
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Attribution" icon={<Wallet size={16} />} count={attributionRules.length} testId="strata-attribution">
        {attributionQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : attributionQ.isError ? (
          <SectionMessage appearance="error" title="Could not load attribution rules">
            <p>{(attributionQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : attributionRules.length === 0 ? (
          <EmptyState size="compact" header="No attribution rules" description="Rules that attribute realized value to initiatives appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {attributionRules.map((rule) => {
              const splits = parseAttributionSplits(rule.definition);
              return (
                <div key={rule.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ alignSelf: 'flex-start' }}>
                    <CatalystTag text={labelize(rule.rule_type)} />
                  </span>
                  {splits ? (
                    <div>
                      {splits.map((s, i) => (
                        <div key={`${s.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ ...bodyStyle, flex: 1, minWidth: 0 }}>{s.label}</span>
                          <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtSplitPct(s.pct)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Gates" icon={<ShieldCheck size={16} />} count={gates.length} testId="strata-benefit-gates">
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
                <div key={gate.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: T.raised }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{stage?.name ?? '—'}</strong>
                    <StatusLozenge
                      status={gate.status}
                      label={labelize(gate.status)}
                      appearance={GATE_STATUS[gate.status] ?? 'default'}
                    />
                    {gate.status === 'decided' && gate.verdict ? <CatalystTag text={labelize(gate.verdict)} color="green" /> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Scheduled {fmtDate(gate.scheduled_for)}</span>
                    {gate.decided_at ? (
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Decided {fmtDate(gate.decided_at)}</span>
                    ) : null}
                  </div>
                  {isOpen && stage && stage.decision_options.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {stage.decision_options.map((opt) => <CatalystTag key={opt} text={labelize(opt)} />)}
                      </div>
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                        Decisions are made in review forums.
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
  const portfolios = portfoliosQ.data ?? [];
  const [portfolioOverride, setPortfolioOverride] = useState<string | null>(null);
  const portfolio = portfolios.find((p) => p.id === portfolioOverride) ?? portfolios[0] ?? null;

  const benefitsQ = useBenefits(portfolio?.id);
  const categoriesQ = useValueCategories();
  const gatesQ = useGateInstances();
  const varQ = useValueAtRisk(portfolio?.id);
  const calcValuesQ = useCalcValues(portfolio ? 'portfolio' : undefined, portfolio?.id);
  const profilesQ = useProfileNames();
  const evidence = useEvidenceDrawer();

  const benefits = portfolio ? (benefitsQ.data ?? []) : [];
  const categories = categoriesQ.data ?? [];
  const openGates = (gatesQ.data ?? []).filter((g) => g.status === 'open' || g.status === 'in_review');

  const selectedBenefit: StrataBenefit | null =
    (slug ? benefits.find((b) => b.slug === slug) : undefined) ?? benefits[0] ?? null;

  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? null : null);

  // Server-calculated portfolio realization (if the calc engine has produced one).
  const portfolioRealization = (calcValuesQ.data ?? []).find((cv) => cv.metric_key === 'realization_index') ?? null;

  const isLoading = portfoliosQ.isLoading;
  const isError = portfoliosQ.isError || benefitsQ.isError;
  const errorMessage =
    (portfoliosQ.error as Error | null)?.message ?? (benefitsQ.error as Error | null)?.message ?? 'Unknown error';

  const registerColumns: Column<StrataBenefit>[] = [
    {
      id: 'benefit', label: 'Benefit', flex: true, sortable: true,
      accessor: (b) => b.name,
      cell: ({ row: b }) => (
        <span style={{
          fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
          color: b.slug ? T.brandText : T.text, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
        }}>
          {b.name}
        </span>
      ),
    },
    {
      id: 'category', label: 'Category', width: 14,
      accessor: (b) => categoryName(b.category_id),
      cell: ({ row: b }) => {
        const name = categoryName(b.category_id);
        return name ? <CatalystTag text={name} /> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'lifecycle', label: 'Lifecycle', width: 14, sortable: true,
      accessor: (b) => b.lifecycle_stage,
      cell: ({ row: b }) => (
        <StatusLozenge
          status={b.lifecycle_stage}
          label={labelize(b.lifecycle_stage)}
          appearance={LIFECYCLE_STAGE[b.lifecycle_stage] ?? 'default'}
        />
      ),
    },
    {
      id: 'confidence', label: 'Confidence', width: 10, align: 'end', sortable: true,
      accessor: (b) => b.confidence,
      cell: ({ row: b }) => (
        <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtConfidence(b.confidence)}</span>
      ),
    },
    {
      id: 'realization', label: 'Realization', width: 14,
      cell: ({ row: b }) => <RealizationCell benefitId={b.id} />,
    },
    {
      id: 'validator', label: 'Validator', width: 12,
      cell: ({ row: b }) => {
        if (!b.validator_id) return <span style={{ color: T.subtlest }}>—</span>;
        const name = profilesQ.data?.get(b.validator_id)?.name ?? null;
        if (name) return <span style={bodyStyle}>{name}</span>;
        return (
          <Tooltip content="Validator assigned">
            <span style={{ display: 'inline-flex', color: 'var(--ds-icon-success)' }} aria-label="Validator assigned">
              <CheckCircle2 size={14} />
            </span>
          </Tooltip>
        );
      },
    },
  ];

  const portfolioSwitcher = portfolios.length > 1 ? (
    <StrataChipMenu
      label="Portfolio"
      value={portfolio?.name ?? '—'}
      testId="strata-portfolio-switcher"
      aria-label="Select portfolio"
      options={portfolios.map((p) => ({
        key: p.id, label: p.name, isSelected: p.id === portfolio?.id, onClick: () => setPortfolioOverride(p.id),
      }))}
    />
  ) : null;

  return (
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<Wallet size={20} />}
        title="Portfolio / VMO"
        description={portfolio?.name}
        actions={portfolioSwitcher}
      />

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
          {/* Executive stat strip — all values server-calculated or counted */}
          <StrataStatStrip
            testId="strata-portfolio-hero"
            items={[
              {
                key: 'value-target',
                label: 'VALUE TARGET',
                value: fmtSarCompact(portfolio.value_target),
                caption: portfolioRealization?.value != null
                  ? `Realized ${fmtRatioPct(portfolioRealization.value)} of target`
                  : undefined,
                captionTone: 'neutral',
                testId: 'strata-stat-value-target',
              },
              {
                key: 'value-at-risk',
                label: 'VALUE AT RISK',
                value: varQ.isLoading ? '—' : fmtSarCompact(varQ.data?.value),
                bandKey: varQ.data?.status_key,
                caption: varQ.isLoading ? 'Loading…' : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Info size={12} /> Server-calculated · View evidence
                  </span>
                ),
                captionTone: varQ.isLoading ? 'neutral' : 'danger',
                onClick: () => evidence.open('Value at Risk', calcValuesQ.data ?? []),
                testId: 'strata-stat-var',
              },
              {
                key: 'benefits',
                label: 'BENEFITS',
                value: benefitsQ.isLoading ? '—' : benefits.length,
                caption: benefitsQ.isLoading ? 'Loading…' : 'In this portfolio',
                testId: 'strata-stat-benefits',
              },
              {
                key: 'open-gates',
                label: 'OPEN GATES',
                value: gatesQ.isLoading ? '—' : openGates.length,
                caption: gatesQ.isLoading ? 'Loading…' : 'Awaiting review',
                testId: 'strata-stat-open-gates',
              },
            ]}
          />

          {/* Realized vs target — only when the calc engine has produced the index */}
          {portfolioRealization?.value != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '-4px 0 16px' }}>
              <span style={labelStyle}>REALIZED VS TARGET</span>
              <span style={{ flex: 1, maxWidth: 320 }}>
                <StrataBandBar value={portfolioRealization.value * 100} bandKey={portfolioRealization.status_key} height={6} />
              </span>
              <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtRatioPct(portfolioRealization.value)}</span>
            </div>
          ) : null}

          {/* Benefit register */}
          <StrataPanel title="Benefit register" icon={<ListChecks size={16} />} count={benefits.length} noPadding testId="strata-benefit-register">
            {benefitsQ.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : benefits.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState size="compact" header="No benefits registered" description="Benefits in this portfolio appear here once identified." />
              </div>
            ) : (
              <JiraTable<StrataBenefit>
                columns={registerColumns}
                data={benefits}
                getRowId={(b) => b.id}
                onRowClick={(b) => { if (b.slug) navigate(Routes.strata.benefit(b.slug)); }}
                focusedRowId={selectedBenefit?.id}
                ariaLabel="Benefit register"
              />
            )}
          </StrataPanel>

          {/* Benefit detail */}
          {selectedBenefit ? (
            <BenefitDetailSection
              benefit={selectedBenefit}
              isFirst={selectedBenefit.id === (benefits[0]?.id ?? null)}
            />
          ) : null}

          {evidence.drawer}
        </>
      )}
    </PageContainer>
  );
}
