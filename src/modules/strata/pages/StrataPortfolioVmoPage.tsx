/**
 * STRATA Portfolio / VMO page — benefit realization (CAT-STRATA-20260705-001).
 * Routes: /strata/portfolio and /strata/portfolio/benefits/:slug.
 *
 * Every executive number is server-calculated: Value at Risk and realization
 * indices come from strata_calculated_values (calc engine RPCs); the UI only
 * renders them with lineage (evidence drawer). Zero-assumption: '—' for unknowns.
 */
import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState,
  SectionMessage, Spinner, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  CheckCircle2, FileBarChart, Gem, Info, ListChecks, ShieldCheck, Wallet,
} from '@/lib/atlaskit-icons';
import { valueApi } from '@/modules/strata/domain';
import { StrataChipMenu,
  StrataBandBar, StrataDecisionModal, StrataPageShell, StrataPanel, StrataStatStrip, StrataValueBar, T,
} from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import {
  StrataAttributionRuleModal, StrataPortfolioMembersPanel, StrataScheduleGateModal,
  VMO_AUTHOR_ROLES, VMO_VALUE_ROLES,
} from '@/modules/strata/components/vmoAuthoring';
import type { StrataGateSubject } from '@/modules/strata/components/vmoAuthoring';
import {
  fmtDate, fmtPct, fmtRatioPct, fmtSarCompact, fmtUnit, labelize,
} from '@/modules/strata/components/format';
import {
  useAssumptions, useBenefitRealization, useBenefits, useBenefitValues, useCalcValues,
  useGateInstances, useGateModels, useInvalidateStrata, usePortfolios, useProfileNames,
  useProjectCards, useStrataContext, useStrataRoles, useValueAtRisk, useValueCategories,
} from '@/modules/strata/hooks/useStrata';
import type {
  StrataAssumption, StrataBenefit, StrataBenefitValue, StrataGateInstance, StrataGateModelStage, StrataPortfolio,
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

// ── Authoring option lists (mirror DB CHECK constraints; UI copy states server rules) ──
/** All lifecycle stages except finance_validated — that stage is only reachable
 *  through value validation, never by direct edit (server-enforced). */
const LIFECYCLE_STAGE_OPTIONS = (
  ['identified', 'qualified', 'approved', 'baselined', 'in_flight', 'forecast_revised', 'realized', 'closed'] as const
).map((s) => ({ value: s, label: labelize(s) }));
const ASSUMPTION_STATUS_OPTIONS = (['open', 'holding', 'broken', 'retired'] as const)
  .map((s) => ({ value: s, label: labelize(s) }));
const VALUE_KIND_OPTIONS = VALUE_KINDS.map((k) => ({ value: k, label: labelize(k) }));
const RULE_TYPE_OPTIONS = (['shared_benefit', 'counterfactual', 'double_counting'] as const)
  .map((t) => ({ value: t, label: labelize(t) }));
const PORTFOLIO_STATUS_OPTIONS = (['active', 'archived'] as const)
  .map((s) => ({ value: s, label: labelize(s) }));

/** Clear-flag detection: the modal opened with a value and the user cleared the field. */
const wasCleared = (initial: string | null | undefined, submitted: unknown): boolean =>
  initial != null && (submitted == null || (typeof submitted === 'string' && submitted.trim() === ''));

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

/** Defensive parse of an attribution rule definition into per-target splits.
 *  Structured Project Card splits ({ splits:[{ project_card_id, pct }] }) resolve
 *  the target's name via `resolveCardName`; legacy initiative rows still parse.
 *  Zero-assumption: an unresolved target renders '—', never a fabricated default.
 *  Unknown shapes → null (caller renders '—'). Display-only, no business math. */
function parseAttributionSplits(
  def: unknown,
  resolveCardName?: (id: string) => string | null,
): AttributionSplit[] | null {
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
        (typeof e.project_card_name === 'string' && e.project_card_name)
        || (typeof e.project_card_id === 'string' && resolveCardName?.(e.project_card_id))
        || (typeof e.initiative_name === 'string' && e.initiative_name)
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
function BenefitDetailSection({ benefit, isFirst, canAuthor, canAuthorValues }: {
  benefit: StrataBenefit;
  isFirst: boolean;
  /** Portfolio/benefit/assumption/attribution/gate authoring affordance. */
  canAuthor: boolean;
  /** Benefit-value authoring affordance (also kpi_owner | data_steward). */
  canAuthorValues: boolean;
}) {
  const navigate = useNavigate();
  const { periods, activePeriod } = useStrataContext();
  const invalidate = useInvalidateStrata();
  /** Governance verdict modal — decide gate / validate benefit value. */
  const [decision, setDecision] = useState<
    | { kind: 'gate'; gate: StrataGateInstance; stage: StrataGateModelStage }
    | { kind: 'validate-value'; id: string; label: string; valueKind: StrataBenefitValue['value_kind'] }
    | null
  >(null);
  /** Authoring modal — create/edit flows against the Lane E RPCs. */
  const [author, setAuthor] = useState<
    | { kind: 'edit-benefit' }
    | { kind: 'add-value' }
    | { kind: 'add-assumption' }
    | { kind: 'edit-assumption'; assumption: StrataAssumption }
    | { kind: 'add-rule' }
    | null
  >(null);
  const [gateSubject, setGateSubject] = useState<StrataGateSubject | null>(null);
  const valuesQ = useBenefitValues(benefit.id);
  const assumptionsQ = useAssumptions(benefit.id);
  const gatesQ = useGateInstances();
  const gateModelsQ = useGateModels();
  const projectCardsQ = useProjectCards();
  const attributionQ = useQuery({
    queryKey: ['strata', 'attribution-rules', benefit.id],
    queryFn: () => valueApi.attributionRules(benefit.id),
    staleTime: 30_000,
  });

  const values = valuesQ.data ?? [];
  const assumptions = assumptionsQ.data ?? [];
  const projectCards = projectCardsQ.data ?? [];
  // Resolve an attribution split's Project Card target to a display name.
  // Zero-assumption: an unknown id resolves to null → the panel renders '—'.
  const resolveCardName = (id: string) => projectCards.find((c) => c.id === id)?.name ?? null;
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

  // Segmented value bar (SRC-M5): active period when it has values, else the
  // latest period that does. Validated = the realized value once finance-validated.
  const barRow = profileRows.find((r) => r.periodId === activePeriod?.id)
    ?? (profileRows.length ? profileRows[profileRows.length - 1] : null);
  const barValue = (kind: StrataBenefitValue['value_kind']): number | null =>
    barRow?.byKind[kind]?.value ?? null;
  const barValidated = barRow?.byKind.realized?.validation_status === 'validated'
    ? barRow.byKind.realized.value
    : null;

  const profileColumns: Column<ProfileRow>[] = [
    {
      id: 'period', label: 'Period', flex: true,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.periodName}</span>,
    },
    ...VALUE_KINDS.map((kind): Column<ProfileRow> => ({
      id: kind, label: labelize(kind), width: 16,
      cell: ({ row }) => {
        const v = row.byKind[kind];
        if (!v) return <span style={{ color: T.subtlest }}>—</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, rowGap: 4, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(v.value, benefit.unit)}</span>
            {v.validation_status !== 'validated' ? (
              <StatusLozenge
                status={v.validation_status}
                label={labelize(v.validation_status)}
                appearance={VALIDATION_STATUS[v.validation_status] ?? 'default'}
              />
            ) : null}
            {v.validation_status === 'pending' ? (
              <Button
                appearance="default"
                spacing="compact"
                onClick={() => setDecision({ kind: 'validate-value', id: v.id, label: `${labelize(kind)} · ${row.periodName}`, valueKind: v.value_kind })}
                testId={`strata-validate-value-${v.id}`}
              >
                Validate
              </Button>
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
        {canAuthor ? (
          <Button appearance="default" spacing="compact" onClick={() => setAuthor({ kind: 'edit-benefit' })} testId="strata-edit-benefit">
            Edit
          </Button>
        ) : null}
        {!isFirst ? (
          <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.portfolio())}>
            Back to first benefit
          </Button>
        ) : null}
      </div>

      <StrataPanel
        title="Value profile"
        icon={<FileBarChart size={16} />}
        count={values.length}
        noPadding
        testId="strata-value-profile"
        actions={canAuthorValues ? (
          <Button appearance="default" spacing="compact" onClick={() => setAuthor({ kind: 'add-value' })} testId="strata-add-value">
            Add value
          </Button>
        ) : undefined}
      >
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
            <EmptyState size="compact" header="No values recorded" description="Baseline, planned, forecast, realized and validated values appear here per period." />
          </div>
        ) : (
          <>
            {barRow ? (
              <div style={{ padding: '12px 16px 4px' }}>
                <StrataValueBar
                  planned={barValue('planned')}
                  forecast={barValue('forecast')}
                  realized={barValue('realized')}
                  validated={barValidated}
                  periodName={barRow.periodName}
                  testId="strata-value-bar"
                />
              </div>
            ) : null}
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

      <StrataPanel
        title="Assumptions"
        icon={<ListChecks size={16} />}
        count={assumptions.length}
        testId="strata-assumptions"
        actions={canAuthor ? (
          <Button appearance="default" spacing="compact" onClick={() => setAuthor({ kind: 'add-assumption' })} testId="strata-add-assumption">
            Add assumption
          </Button>
        ) : undefined}
      >
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
                {canAuthor ? (
                  <Button
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => setAuthor({ kind: 'edit-assumption', assumption: a })}
                    testId={`strata-edit-assumption-${a.id}`}
                  >
                    Edit
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </StrataPanel>

      <StrataPanel
        title="Attribution"
        icon={<Wallet size={16} />}
        count={attributionRules.length}
        testId="strata-attribution"
        actions={canAuthor ? (
          <Button appearance="default" spacing="compact" onClick={() => setAuthor({ kind: 'add-rule' })} testId="strata-add-attribution-rule">
            Add rule
          </Button>
        ) : undefined}
      >
        {attributionQ.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : attributionQ.isError ? (
          <SectionMessage appearance="error" title="Could not load attribution rules">
            <p>{(attributionQ.error as Error | null)?.message ?? 'Unknown error'}</p>
          </SectionMessage>
        ) : attributionRules.length === 0 ? (
          <EmptyState size="compact" header="No attribution rules" description="Rules that attribute realized value to Project Cards appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {attributionRules.map((rule) => {
              const splits = parseAttributionSplits(rule.definition, resolveCardName);
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
                  ) : rule.definition != null ? (
                    /* Unrecognized shape — show the governed definition verbatim, pretty-printed */
                    <pre style={{
                      margin: 0, padding: 8, borderRadius: 6, background: T.sunken,
                      border: `1px solid ${T.border}`, overflowX: 'auto',
                      fontSize: 'var(--ds-font-size-100)', color: T.subtle, lineHeight: 1.5,
                    }}>
                      {JSON.stringify(rule.definition, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StrataPanel>

      <StrataPanel
        title="Gates"
        icon={<ShieldCheck size={16} />}
        count={gates.length}
        testId="strata-benefit-gates"
        actions={canAuthor ? (
          <Button
            appearance="default"
            spacing="compact"
            onClick={() => setGateSubject({ type: 'benefit', id: benefit.id, label: benefit.name })}
            testId="strata-schedule-gate"
          >
            Schedule gate
          </Button>
        ) : undefined}
      >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {stage.decision_options.map((opt) => <CatalystTag key={opt} text={labelize(opt)} />)}
                      </div>
                      <Button
                        appearance="primary"
                        spacing="compact"
                        onClick={() => setDecision({ kind: 'gate', gate, stage })}
                        testId={`strata-gate-decide-${gate.id}`}
                      >
                        Decide
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </StrataPanel>

      {/* Governance verdict modals — verdicts are governed per-stage config;
          the RPC rejects anything outside stage.decision_options + enforces SoD. */}
      <StrataDecisionModal
        open={decision?.kind === 'gate'}
        onClose={() => setDecision(null)}
        title={`Decide gate · ${decision?.kind === 'gate' ? decision.stage.name : ''}`}
        description="The verdict options come from the governed gate model. The subject owner cannot decide their own gate."
        options={decision?.kind === 'gate'
          ? decision.stage.decision_options.map((opt) => ({
              value: opt,
              label: labelize(opt),
              appearance: opt === 'stop' || opt === 'reject' ? 'danger' as const : undefined,
            }))
          : []}
        confirmLabel="Record decision"
        onConfirm={async (verdict, note) => {
          if (decision?.kind !== 'gate') return;
          await valueApi.decideGate(decision.gate.id, verdict, note || undefined);
          invalidate();
        }}
        testId="strata-gate-decide-modal"
      />
      <StrataDecisionModal
        open={decision?.kind === 'validate-value'}
        onClose={() => setDecision(null)}
        title={`Validate value · ${decision?.kind === 'validate-value' ? decision.label : ''}`}
        description="Realized values require independent validation — the submitter cannot validate their own value."
        options={[
          { value: 'validated', label: 'Validate' },
          { value: 'rejected', label: 'Reject', appearance: 'danger' },
        ]}
        onConfirm={async (verdict, note) => {
          if (decision?.kind !== 'validate-value') return;
          await valueApi.validateBenefitValue(decision.id, verdict as 'validated' | 'rejected', note || undefined);
          try {
            // A newly validated REALIZED value changes the server-calculated numbers:
            // recompute benefit realization and (if portfolio-linked) value at risk
            // so the register/hero update from authored data.
            if (verdict === 'validated' && decision.valueKind === 'realized') {
              await valueApi.benefitRealization(benefit.id);
              if (benefit.portfolio_id) await valueApi.valueAtRisk(benefit.portfolio_id);
            }
          } finally {
            invalidate();
          }
        }}
        testId="strata-validate-value-modal"
      />

      {/* ── Authoring modals (Lane E) — RPC-validated; rejections surface verbatim ── */}
      <StrataFormModal
        open={author?.kind === 'edit-benefit'}
        onClose={() => setAuthor(null)}
        title={`Edit benefit · ${benefit.name}`}
        submitLabel="Save"
        fields={[
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'validatorId', label: 'Validator', kind: 'user', helper: 'Validator must differ from owner (SoD)' },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. SAR, %, hours' },
          { key: 'valueHypothesis', label: 'Value hypothesis', kind: 'textarea' },
          { key: 'causalMechanism', label: 'Causal mechanism', kind: 'textarea' },
          { key: 'confidence', label: 'Confidence', kind: 'number', min: 0, max: 1, step: 0.05, helper: '0–1' },
          {
            key: 'lifecycleStage', label: 'Lifecycle stage', kind: 'select', options: LIFECYCLE_STAGE_OPTIONS,
            helper: 'Forward-only (forecast revised may step back); finance validated is set by value validation',
          },
        ]}
        initial={{
          ownerId: benefit.owner_id, validatorId: benefit.validator_id, unit: benefit.unit,
          valueHypothesis: benefit.value_hypothesis, causalMechanism: benefit.causal_mechanism,
          confidence: benefit.confidence, lifecycleStage: benefit.lifecycle_stage,
        }}
        onSubmit={async (v) => {
          await valueApi.updateBenefit(benefit.id, {
            ownerId: (v.ownerId as string | null) ?? undefined,
            validatorId: (v.validatorId as string | null) ?? undefined,
            unit: (v.unit as string | null) ?? undefined,
            valueHypothesis: (v.valueHypothesis as string | null) ?? undefined,
            causalMechanism: (v.causalMechanism as string | null) ?? undefined,
            confidence: (v.confidence as number | null) ?? undefined,
            lifecycleStage: (v.lifecycleStage as string | null) ?? undefined,
            // Clear affordances: the field opened with a value and the user emptied it.
            clearOwner: wasCleared(benefit.owner_id, v.ownerId),
            clearValidator: wasCleared(benefit.validator_id, v.validatorId),
          });
          invalidate();
        }}
        testId="strata-edit-benefit-modal"
      />
      <StrataFormModal
        open={author?.kind === 'add-value'}
        onClose={() => setAuthor(null)}
        title={`Add value · ${benefit.name}`}
        description="Values enter as pending; realized values must be validated by a different user than the submitter."
        fields={[
          { key: 'valueKind', label: 'Value kind', kind: 'select', required: true, options: VALUE_KIND_OPTIONS },
          {
            key: 'periodId', label: 'Period', kind: 'select', required: true,
            options: periods.map((p) => ({ value: p.id, label: p.name })),
            helper: 'Closed periods reject writes',
          },
          { key: 'value', label: 'Value', kind: 'number', required: true, helper: benefit.unit ?? undefined },
        ]}
        onSubmit={async (v) => {
          // Reject negative/non-finite before the RPC round-trip; server RPC
          // enforces the same guard (strata_create_benefit_value). Throwing
          // keeps the modal open with an in-modal field error (V4-OPEN-021).
          const amount = Number(v.value);
          if (!Number.isFinite(amount) || amount < 0) {
            throw new Error('Value must be a finite, non-negative number.');
          }
          await valueApi.createBenefitValue({
            benefitId: benefit.id,
            periodId: v.periodId as string,
            valueKind: v.valueKind as StrataBenefitValue['value_kind'],
            value: amount,
          });
          invalidate();
        }}
        testId="strata-add-value-modal"
      />
      <StrataFormModal
        open={author?.kind === 'add-assumption' || author?.kind === 'edit-assumption'}
        onClose={() => setAuthor(null)}
        title={author?.kind === 'edit-assumption' ? 'Edit assumption' : 'Add assumption'}
        submitLabel={author?.kind === 'edit-assumption' ? 'Save' : 'Create'}
        fields={[
          { key: 'description', label: 'Description', kind: 'textarea', required: true },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'confidence', label: 'Confidence', kind: 'number', min: 0, max: 1, step: 0.05, helper: '0–1' },
          { key: 'status', label: 'Status', kind: 'select', options: ASSUMPTION_STATUS_OPTIONS },
        ]}
        initial={author?.kind === 'edit-assumption'
          ? {
              description: author.assumption.description, ownerId: author.assumption.owner_id,
              confidence: author.assumption.confidence, status: author.assumption.status,
            }
          : { status: 'open' }}
        onSubmit={async (v) => {
          const patch = {
            description: (v.description as string | null) ?? undefined,
            ownerId: (v.ownerId as string | null) ?? undefined,
            confidence: (v.confidence as number | null) ?? undefined,
            status: (v.status as string | null) ?? undefined,
          };
          if (author?.kind === 'edit-assumption') {
            await valueApi.updateAssumption(author.assumption.id, {
              ...patch,
              // Clear affordance: the owner field opened with a value and the user emptied it.
              clearOwner: wasCleared(author.assumption.owner_id, v.ownerId),
            });
          } else {
            await valueApi.createAssumption({ benefitId: benefit.id, ...patch, description: String(v.description) });
          }
          invalidate();
        }}
        testId="strata-assumption-modal"
      />
      <StrataAttributionRuleModal
        open={author?.kind === 'add-rule'}
        onClose={() => setAuthor(null)}
        benefitId={benefit.id}
        benefitName={benefit.name}
        projectCards={projectCards}
        ruleTypeOptions={RULE_TYPE_OPTIONS}
        onChanged={invalidate}
      />
      <StrataScheduleGateModal
        open={!!gateSubject}
        subject={gateSubject}
        onClose={() => setGateSubject(null)}
        onScheduled={invalidate}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataPortfolioVmoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const portfoliosQ = usePortfolios();
  const portfolios = portfoliosQ.data ?? [];
  // Selected portfolio is URL-persisted (?portfolio=<slug>) so it survives
  // refresh, deep links and back/forward instead of resetting to the first
  // portfolio (V3-OPEN-018). Token is the slug, with an id fallback for the
  // rare null-slug row. Cycle/Period already persist via ?cycle=/?period=.
  const portfolioToken = (p: StrataPortfolio) => p.slug ?? p.id;
  const portfolioParam = searchParams.get('portfolio');
  const portfolio =
    portfolios.find((p) => portfolioToken(p) === portfolioParam) ?? portfolios[0] ?? null;
  const selectPortfolio = (p: StrataPortfolio) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('portfolio', portfolioToken(p));
      return next;
    });
  };

  const benefitsQ = useBenefits(portfolio?.id);
  const categoriesQ = useValueCategories();
  const gatesQ = useGateInstances();
  const varQ = useValueAtRisk(portfolio?.id);
  const calcValuesQ = useCalcValues(portfolio ? 'portfolio' : undefined, portfolio?.id);
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();

  // UI affordance gating only — the RPCs enforce the real role rules.
  const roles = rolesQ.data ?? [];
  const canAuthor = roles.some((r) => (VMO_AUTHOR_ROLES as readonly string[]).includes(r));
  const canAuthorValues = roles.some((r) => (VMO_VALUE_ROLES as readonly string[]).includes(r));

  /** Page-level authoring modals (portfolio create/edit, benefit create). */
  const [portfolioModal, setPortfolioModal] = useState<'create' | 'edit' | null>(null);
  const [benefitCreateOpen, setBenefitCreateOpen] = useState(false);
  /** Gate scheduling launched from a membership row (initiative / project card). */
  const [memberGateSubject, setMemberGateSubject] = useState<StrataGateSubject | null>(null);

  const benefits = portfolio ? (benefitsQ.data ?? []) : [];
  const categories = categoriesQ.data ?? [];
  // Category authoring options: approved governed records only.
  const approvedCategories = categories.filter((c) => c.status === 'approved');
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
      id: 'category', label: 'Category', width: 12,
      accessor: (b) => categoryName(b.category_id),
      cell: ({ row: b }) => {
        const name = categoryName(b.category_id);
        return name ? <CatalystTag text={name} /> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'lifecycle', label: 'Lifecycle', width: 12, sortable: true,
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
      id: 'realization', label: 'Realization', width: 13,
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
        key: p.id, label: p.name, isSelected: p.id === portfolio?.id, onClick: () => selectPortfolio(p),
      }))}
    />
  ) : null;

  const headerActions = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {portfolioSwitcher}
      {canAuthor && portfolio ? (
        <Button appearance="default" spacing="compact" onClick={() => setPortfolioModal('edit')} testId="strata-edit-portfolio">
          Edit portfolio
        </Button>
      ) : null}
      {canAuthor ? (
        <Button appearance="primary" spacing="compact" onClick={() => setPortfolioModal('create')} testId="strata-new-portfolio">
          New portfolio
        </Button>
      ) : null}
    </span>
  );

  // Benefit deep-link (/strata/portfolio/benefits/:slug) gets an entity trail;
  // the portfolio index renders without one.
  const trailBenefit = slug ? benefits.find((b) => b.slug === slug) ?? null : null;

  return (
    <StrataPageShell
      trail={trailBenefit
        ? [{ text: 'Portfolio & VMO', href: Routes.strata.portfolio() }, { text: trailBenefit.name }]
        : undefined}
      docTitle={trailBenefit ? trailBenefit.name : 'Portfolio / VMO'}
      headerActions={headerActions}
      testId="strata-portfolio-chrome"
    >
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
                    <Info size={12} /> {portfolio.slug ? 'Server-calculated · View evidence' : 'Server-calculated'}
                  </span>
                ),
                captionTone: varQ.isLoading ? 'neutral' : 'danger',
                // Evidence page needs a slug route — never navigate to /null/
                onClick: portfolio.slug
                  ? () => navigate(Routes.strata.portfolioEvidence(portfolio.slug!))
                  : undefined,
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

          {/* Portfolio membership (initiatives / project cards funding the value) */}
          <div style={{ marginBottom: 16 }}>
            <StrataPortfolioMembersPanel
              portfolioId={portfolio.id}
              canAuthor={canAuthor}
              onScheduleGate={setMemberGateSubject}
            />
          </div>

          {/* Benefit register */}
          <StrataPanel
            title="Benefit register"
            icon={<ListChecks size={16} />}
            count={benefits.length}
            noPadding
            testId="strata-benefit-register"
            actions={canAuthor ? (
              <Button appearance="default" spacing="compact" onClick={() => setBenefitCreateOpen(true)} testId="strata-new-benefit">
                New benefit
              </Button>
            ) : undefined}
          >
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
              canAuthor={canAuthor}
              canAuthorValues={canAuthorValues}
            />
          ) : null}
        </>
      )}

      {/* ── Page-level authoring modals (Lane E) — RPC-validated; rejections verbatim ── */}
      <StrataFormModal
        open={portfolioModal === 'create'}
        onClose={() => setPortfolioModal(null)}
        title="New portfolio"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          {
            key: 'categoryId', label: 'Category', kind: 'select',
            options: approvedCategories.map((c) => ({ value: c.id, label: c.name })),
            helper: 'Approved value categories only',
          },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'valueTarget', label: 'Value target', kind: 'number', min: 0, helper: 'SAR' },
        ]}
        onSubmit={async (v) => {
          await valueApi.createPortfolio({
            name: String(v.name).trim(),
            description: (v.description as string | null) || undefined,
            categoryId: (v.categoryId as string | null) ?? undefined,
            ownerId: (v.ownerId as string | null) ?? undefined,
            valueTarget: v.valueTarget != null ? Number(v.valueTarget) : undefined,
          });
          invalidate();
        }}
        testId="strata-new-portfolio-modal"
      />
      {portfolio ? (
        <StrataFormModal
          open={portfolioModal === 'edit'}
          onClose={() => setPortfolioModal(null)}
          title={`Edit portfolio · ${portfolio.name}`}
          submitLabel="Save"
          fields={[
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'description', label: 'Description', kind: 'textarea' },
            {
              key: 'categoryId', label: 'Category', kind: 'select',
              options: approvedCategories.map((c) => ({ value: c.id, label: c.name })),
              helper: 'Approved value categories only',
            },
            { key: 'ownerId', label: 'Owner', kind: 'user' },
            { key: 'valueTarget', label: 'Value target', kind: 'number', min: 0, helper: 'SAR' },
            {
              key: 'status', label: 'Status', kind: 'select', required: true, options: PORTFOLIO_STATUS_OPTIONS,
              helper: 'Archived portfolios leave active tracking',
            },
          ]}
          initial={{
            name: portfolio.name, description: portfolio.description, categoryId: portfolio.category_id,
            ownerId: portfolio.owner_id, valueTarget: portfolio.value_target, status: portfolio.status,
          }}
          onSubmit={async (v) => {
            await valueApi.updatePortfolio(portfolio.id, {
              name: (v.name as string | null) ?? undefined,
              description: (v.description as string | null) ?? undefined,
              categoryId: (v.categoryId as string | null) ?? undefined,
              ownerId: (v.ownerId as string | null) ?? undefined,
              valueTarget: v.valueTarget != null ? Number(v.valueTarget) : undefined,
              status: (v.status as 'active' | 'archived' | null) ?? undefined,
              // Clear affordances: the field opened with a value and the user emptied it.
              clearOwner: wasCleared(portfolio.owner_id, v.ownerId),
              clearCategory: wasCleared(portfolio.category_id, v.categoryId),
            });
            invalidate();
          }}
          testId="strata-edit-portfolio-modal"
        />
      ) : null}
      <StrataFormModal
        open={benefitCreateOpen}
        onClose={() => setBenefitCreateOpen(false)}
        title="New benefit"
        description="Owner, validator, values and lifecycle are authored on the benefit after creation."
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'portfolioId', label: 'Portfolio', kind: 'select',
            options: portfolios.map((p) => ({ value: p.id, label: p.name })),
          },
          {
            key: 'categoryId', label: 'Category', kind: 'select',
            options: approvedCategories.map((c) => ({ value: c.id, label: c.name })),
            helper: 'Approved value categories only',
          },
        ]}
        initial={{ portfolioId: portfolio?.id ?? null }}
        onSubmit={async (v) => {
          await valueApi.createBenefit({
            name: String(v.name).trim(),
            portfolioId: (v.portfolioId as string | null) ?? undefined,
            categoryId: (v.categoryId as string | null) ?? undefined,
          });
          invalidate();
        }}
        testId="strata-new-benefit-modal"
      />
      <StrataScheduleGateModal
        open={!!memberGateSubject}
        subject={memberGateSubject}
        onClose={() => setMemberGateSubject(null)}
        onScheduled={invalidate}
      />
    </StrataPageShell>
  );
}
