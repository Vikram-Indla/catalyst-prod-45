/**
 * STRATA KPI Detail — /strata/kpis/:slug (CAT-STRATA-20260705-001).
 * Full lineage view: server-computed achievement hero, trend, ownership (SoD),
 * governed formula versions, upload-run lineage, commentary.
 * UI never computes achievement/RAG — values come from strata_calc_kpi_achievement
 * and strata_calculated_values verbatim. Unknowns render '—'.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Button, CatalystTag, EmptyState, Lozenge,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, Database, GitBranch, Info, Network, Users,
} from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { configApi, kpiApi, strategyApi } from '@/modules/strata/domain';
import { methodologyBreaks } from '@/modules/strata/domain/materiality';
import {
  useBandResolver, useDataSources, useElementKpis, useInvalidateStrata, useKpiAchievement, useKpiBySlug,
  useKpiDetail, useKpiDependencyImpact, useKpiEvidenceChain, useKpis, useKpiSubmissionBlockers, useKpiTypes,
  useProfileNames, useStrataContext, useStrataRoles, useStrategyElements, useThresholdSchemes, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import type { StrataProfileRef } from '@/modules/strata/hooks/useStrata';
import {
  StrataBandBar, StrataBandLozenge, StrataChainStrip, StrataDecisionModal, StrataPageShell, StrataPanel, T,
} from '@/modules/strata/components/shared';
import type { StrataChainSegment } from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtDate, fmtDateTime, fmtPct, fmtRatioPct, fmtUnit, labelize } from '@/modules/strata/components/format';
import { StrataGovernedStatusLozenge } from '@/modules/strata/pages/StrataKpiLibraryPage';
import type {
  StrataKpi, StrataKpiActual, StrataKpiTarget, StrataStrategyElement, ValidationStatus,
} from '@/modules/strata/types';

const STALE = 30_000;

/** UI affordance gating only — server RPCs enforce the real role rules (SoD etc.). */
const CREATE_ROLES = ['strategy_office', 'kpi_owner', 'strata_admin'] as const;
const SUBMIT_ROLES = ['kpi_owner', 'data_steward', 'strategy_office', 'strata_admin'] as const;
/** Validation is a governed write (attest actual). Viewer sees no Validate button —
 *  presentation only; the RPC enforces submitter≠validator SoD (anchor 06 §17). */
const VALIDATE_ROLES = ['vmo_validator', 'data_steward', 'strategy_office', 'strata_admin'] as const;

const DIRECTION_OPTIONS = [
  { value: 'higher_better', label: 'Higher is better' },
  { value: 'lower_better', label: 'Lower is better' },
  { value: 'band', label: 'Band' },
  { value: 'manual', label: 'Manual' },
];
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
];
const ENTRY_METHOD_OPTIONS = [
  { value: 'upload', label: 'Upload' },
  { value: 'manual', label: 'Manual' },
  { value: 'connector', label: 'Connector' },
];
const FORMULA_TYPE_BASE = ['ratio_to_target', 'lower_better', 'band', 'manual_index'];
const TARGET_TYPE_OPTIONS = [
  { value: 'point', label: 'Point' },
  { value: 'band', label: 'Band' },
  { value: 'milestone', label: 'Milestone' },
];

/** Shape returned by strata_calc_kpi_achievement — rendered verbatim, never recomputed. */
interface KpiAchievementPayload {
  achievement: number | null;
  actual: number | null;
  target: number | null;
  status_key: string | null;
  has_data?: boolean;
  confidence?: number | null;
}

/** Loose row shape for strata_commentary — fields rendered defensively. */
interface StrataCommentaryRow {
  id: string;
  period_id?: string | null;
  body?: string | null;
  content?: string | null;
  author_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
  band: 'Band',
  manual: 'Manual',
};

const VALIDATION_LOZENGE: Record<ValidationStatus, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  validated: { label: 'Validated', appearance: 'success' },
  pending: { label: 'Pending', appearance: 'moved' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  quarantined: { label: 'Quarantined', appearance: 'moved' },
};

function ValidationLozenge({ status }: { status: ValidationStatus | string | null | undefined }) {
  if (!status) return <Dash />;
  const cfg = VALIDATION_LOZENGE[status as ValidationStatus];
  if (!cfg) return <Lozenge appearance="default">{labelize(String(status))}</Lozenge>;
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{children}</div>
);

/**
 * KPI-first strategy linking — link THIS KPI to strategy elements (themes/objectives).
 * Inverse of the Strategy Room's per-element KpiLinksModal (element↔KPI is a
 * strata_element_kpis join row). Linking is gated to approved KPIs (server rejects
 * otherwise); unlink of existing links stays available regardless of status.
 */
function KpiStrategyLinksModal({
  kpi, links, elements, canLink, onClose, onChanged,
}: {
  kpi: StrataKpi;
  links: Array<{ element_id: string; kpi_id: string; weight: number | null }>;
  elements: StrataStrategyElement[];
  canLink: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [elementId, setElementId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [contribution, setContribution] = useState<'direct' | 'supporting'>('direct');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const linkedIds = new Set(links.map((l) => l.element_id));
  // Strategy hierarchy = theme-context elements; project-context elements belong to Project Cards.
  const elementOptions: SelectOption<string>[] = elements
    .filter((e) => e.context === 'theme' && !linkedIds.has(e.id))
    .map((e) => ({ value: e.id, label: e.name }));
  const contributionOptions: SelectOption<string>[] = [
    { value: 'direct', label: 'Direct' },
    { value: 'supporting', label: 'Supporting' },
  ];

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!elementId) { setError('Required: strategy element'); return; }
    const w = weight === '' ? null : Number(weight);
    if (w != null && (Number.isNaN(w) || w < 0 || w > 100)) {
      setError('Weight must be between 0 and 100.');
      return;
    }
    const ok = await run(() => strategyApi.linkElementKpi(elementId, kpi.id, w ?? undefined, contribution));
    if (ok) { setElementId(null); setWeight(''); }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-kpi-strategy-links-modal">
      <ModalHeader><ModalTitle>Strategy links — {kpi.name}</ModalTitle></ModalHeader>
      <ModalBody>
        {links.length === 0 ? (
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            This KPI is not linked to any strategy element yet.
          </p>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {links.map((l) => (
              <div
                key={l.element_id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ flex: 1, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                  {elementById.get(l.element_id)?.name ?? '—'}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
                  {l.weight != null ? `Weight ${l.weight}` : '—'}
                </span>
                <Button
                  spacing="compact"
                  appearance="subtle"
                  isDisabled={busy}
                  onClick={() => run(() => strategyApi.unlinkElementKpi(l.element_id, kpi.id))}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
        {canLink ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <FieldLabel>Strategy element</FieldLabel>
              <Select
                options={elementOptions}
                value={elementOptions.find((o) => o.value === elementId) ?? null}
                onChange={(next) => setElementId(next?.value ?? null)}
                placeholder="Select strategy element…"
                isSearchable
                usePortal
                aria-label="Strategy element"
              />
            </div>
            <div>
              <FieldLabel>Weight (0–100)</FieldLabel>
              <Textfield
                type="number"
                value={weight}
                onChange={(e) => setWeight((e.target as HTMLInputElement).value)}
                aria-label="Weight"
              />
            </div>
            <div>
              <FieldLabel>Contribution</FieldLabel>
              <Select
                options={contributionOptions}
                value={contributionOptions.find((o) => o.value === contribution) ?? null}
                onChange={(next) => setContribution((next?.value as 'direct' | 'supporting') ?? 'direct')}
                usePortal
                aria-label="Contribution"
              />
            </div>
          </div>
        ) : (
          <SectionMessage appearance="information" title="Approval required">
            <p>Approve this KPI to link it to the strategy hierarchy. You can still remove existing links.</p>
          </SectionMessage>
        )}
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Close</Button>
        <Button appearance="primary" onClick={link} isDisabled={busy || !canLink}>
          {busy ? 'Working…' : 'Link element'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Clear-flag detection: the modal opened with a value and the user cleared the field. */
const wasCleared = (initial: string | null | undefined, submitted: unknown): boolean =>
  initial != null && (submitted == null || (typeof submitted === 'string' && submitted.trim() === ''));

/** Person cell (S-132): resolved profile name + avatar, or '—'. NEVER a UUID. */
function PersonName({ id, profiles }: { id: string | null; profiles?: Map<string, StrataProfileRef> }) {
  if (!id) return <Dash />;
  const p = profiles?.get(id);
  if (!p?.name) return <Dash />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Avatar size="xsmall" name={p.name} src={p.avatarUrl ?? undefined} />
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
    </span>
  );
}

/** Confidence values arrive as ratio (0–1) or percent — normalize for display (S-136). */
const fmtConfidence = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return v <= 1 ? fmtRatioPct(v) : fmtPct(v);
};

const OWNERSHIP_ROLES: Array<{ label: string; key: keyof Pick<StrataKpi,
  'accountable_owner_id' | 'data_owner_id' | 'reporter_id' | 'validator_id' | 'escalation_owner_id'> }> = [
  { label: 'Accountable owner', key: 'accountable_owner_id' },
  { label: 'Data owner', key: 'data_owner_id' },
  { label: 'Reporter', key: 'reporter_id' },
  { label: 'Validator', key: 'validator_id' },
  { label: 'Escalation owner', key: 'escalation_owner_id' },
];

interface TrendRow {
  periodId: string;
  period: { name: string; starts_on?: string | null } | null;
  target: StrataKpiTarget | null;
  actual: StrataKpiActual | null;
  /** F-9: which KPI VERSION produced this point. Facts are never repointed, so this is read from
   *  the row's own kpi_id — it is provenance, not an inference. */
  kpiVersion: number | null;
  /** 'material' on the version that INTRODUCED a comparability break; null when not a revision. */
  revisionClass: string | null;
}

/** Shared KO-DEF-002 dependency-impact renderer — reused by the retire and revise modals so the
 *  displayed impact can never diverge from the server's. */
function DependencyImpactList({ impact, loading }: {
  impact: import('@/modules/strata/domain').StrataKpiDependencyImpact | undefined;
  loading: boolean;
}) {
  if (loading) return <p style={{ margin: 0, color: T.subtle }}>Checking dependencies…</p>;
  if (!impact) return null;
  const c = impact.current; const h = impact.historical;
  const currentRows: Array<[string, number]> = [
    ['Strategy / objective links', c.element_links],
    ['Scorecard model measures', c.model_measures],
    ['Scorecard instance lines', c.scorecard_lines],
    ['Key Results', c.key_results],
    ['Project / initiative links', c.initiative_links],
  ];
  const histRows: Array<[string, number]> = [
    ['Locked scorecard lines', h.scorecard_lines_locked],
    ['Closed-OKR Key Results', h.key_results_closed],
    ['Retired-element links', h.element_links],
    ['Superseded model measures', h.model_measures],
  ];
  const cell = { padding: 'var(--ds-space-025) 0', fontSize: 'var(--ds-font-size-100)' } as const;
  return (
    <div data-testid="strata-kpi-dependency-impact" style={{ display: 'grid', gap: 8 }}>
      <div>
        <div style={{ fontWeight: 600, color: T.subtle, fontSize: 'var(--ds-font-size-050)' }}>
          ACTIVE DEPENDENCIES ({impact.active_total})
        </div>
        {currentRows.map(([label, n]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', ...cell }}>
            <span style={{ color: T.text }}>{label}</span>
            <span style={{ fontWeight: 600, color: n > 0 ? T.text : T.subtlest }}>{n}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: T.subtle, fontSize: 'var(--ds-font-size-050)' }}>
          HISTORICAL (unchanged by this action)
        </div>
        {histRows.map(([label, n]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', ...cell }}>
            <span style={{ color: T.subtle }}>{label}</span>
            <span style={{ color: T.subtlest }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetireLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>
      {children}{required ? <span style={{ color: 'var(--ds-text-danger)' }}> *</span> : null}
    </div>
  );
}

/** KO-DEF-002 governed retirement modal. Gates are server-enforced by strata_retire_kpi; this
 *  collects governed inputs, blocks confirmation until they are coherent, and surfaces any server
 *  rejection verbatim. */
function RetireKpiModal({ kpi, onClose, onDone }: {
  kpi: { id: string; name: string; version?: number | null; lineage_id?: string | null };
  onClose: () => void; onDone: () => void;
}) {
  const impactQ = useKpiDependencyImpact(kpi.id, true);
  const kpisQ = useKpis();
  const [reason, setReason] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [useException, setUseException] = useState(false);
  const [exception, setException] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impact = impactQ.data;
  const active = impact?.active_total ?? 0;
  const replacementOptions: SelectOption<string>[] = (kpisQ.data ?? [])
    .filter((k) => k.status === 'approved' && k.id !== kpi.id && k.lineage_id !== kpi.lineage_id)
    .map((k) => ({ value: k.id, label: `${k.name} (v${k.version})` }));

  const dependencyOk = (impact != null && active === 0) || !!replacementId || (useException && exception.trim() !== '');
  const canConfirm = !busy && impact != null && reason.trim() !== '' && effectiveTo !== '' && dependencyOk;

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await configApi.retireKpi({
        kpiId: kpi.id, reason: reason.trim(), effectiveTo,
        replacementId: replacementId ?? undefined,
        exception: useException ? exception.trim() : undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); // server governance message, verbatim
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-kpi-retire-modal">
      <ModalHeader><ModalTitle>Retire “{kpi.name}”</ModalTitle></ModalHeader>
      <ModalBody>
        <div style={{ display: 'grid', gap: 14 }}>
          <SectionMessage appearance="information" title="Historical facts are preserved">
            <p style={{ margin: 0 }}>
              Retirement is prospective. The KPI, all its versions and every recorded actual, target
              and calculation stay exactly as they are — only future adoption stops on the effective date.
            </p>
          </SectionMessage>
          <DependencyImpactList impact={impact} loading={impactQ.isLoading} />
          {impact != null && active > 0 ? (
            <SectionMessage appearance="warning" title={`${active} active dependency(ies)`}>
              <p style={{ margin: 0 }}>Supply a governed replacement KPI or record an authorized exception to retire while these remain.</p>
            </SectionMessage>
          ) : null}
          <div>
            <RetireLabel required>Retirement reason</RetireLabel>
            <Textfield value={reason} onChange={(e) => setReason((e.target as HTMLInputElement).value)}
              placeholder="Why is this KPI being retired?" testId="strata-retire-reason" />
          </div>
          <div>
            <RetireLabel required>Effective date (prospective)</RetireLabel>
            <Textfield type="date" value={effectiveTo}
              onChange={(e) => setEffectiveTo((e.target as HTMLInputElement).value)} testId="strata-retire-effective" />
          </div>
          <div>
            <RetireLabel>Replacement KPI (optional)</RetireLabel>
            <Select options={replacementOptions}
              value={replacementOptions.find((o) => o.value === replacementId) ?? null}
              onChange={(o) => setReplacementId(o?.value ?? null)}
              placeholder="Select a governed replacement…" isClearable usePortal aria-label="Replacement KPI" />
          </div>
          <div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--ds-font-size-100)', color: T.text }}>
              <input type="checkbox" checked={useException} data-testid="strata-retire-exception-toggle"
                onChange={(e) => setUseException(e.target.checked)} />
              Record an authorized exception instead
            </label>
            {useException ? (
              <div style={{ marginTop: 'var(--ds-space-075)' }}>
                <Textfield value={exception} onChange={(e) => setException((e.target as HTMLInputElement).value)}
                  placeholder="Authorization reference / justification" testId="strata-retire-exception" />
              </div>
            ) : null}
          </div>
          {error ? (
            <SectionMessage appearance="error" title="Retirement rejected">
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</p>
            </SectionMessage>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button appearance="danger" onClick={submit} isDisabled={!canConfirm} testId="strata-retire-confirm">
          {busy ? 'Retiring…' : 'Retire KPI'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function StrataKpiDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { periods, activePeriod, activeCycle } = useStrataContext();

  const kpiQ = useKpiBySlug(slug);
  const kpi = kpiQ.data ?? null;
  // KO-DEF-001 — the exact prerequisites the server enforces at submit. Same RPC, so the list
  // shown here and the list that blocks the transition cannot disagree.
  const blockersQ = useKpiSubmissionBlockers(kpi?.id, kpi?.status === 'draft');
  const [retireOpen, setRetireOpen] = useState(false);
  const submitBlockers = blockersQ.data ?? [];
  // F-9: pass the lineage so the trend spans every version of this KPI, not just the open one.
  const detailQ = useKpiDetail(kpi?.id, kpi?.lineage_id ?? undefined);
  const achievementQ = useKpiAchievement(kpi?.id, activePeriod?.id);
  const uploadRunsQ = useUploadRuns();
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const dataSourcesQ = useDataSources();
  const kpiTypesQ = useKpiTypes();
  const schemesQ = useThresholdSchemes();
  const elementKpisQ = useElementKpis();
  const elementsQ = useStrategyElements(activeCycle?.id);
  // STRATA-E2E-010: resolve the perspective a linked strategy element governs the KPI
  // into, so the governed perspective is visible on the KPI detail (not just the element name).
  const perspectivesQ = useQuery({
    queryKey: ['strata', 'perspectives'],
    queryFn: () => configApi.perspectives(),
    staleTime: 60_000,
  });
  const invalidate = useInvalidateStrata();
  // Evidence chain (F-REP-005) powers BOTH the chain strip and the trust strip
  // (elements/projects/benefits + formula_version). Zero-assumption: unloaded
  // segments render honest empties — never invented links.
  const chainQ = useKpiEvidenceChain(kpi?.id, activePeriod?.id);
  const resolveBand = useBandResolver();
  const [showTrendData, setShowTrendData] = useState(false);
  const [showStrategyLinks, setShowStrategyLinks] = useState(false);
  /** KO-DEF-002 — governed revision of an Approved KPI (reason + materiality are mandatory). */
  const [revisionOpen, setRevisionOpen] = useState(false);
  // KO-DEF-002 item 6 — complete dependency impact for the revision modal (not strategy links only).
  const revisionImpactQ = useKpiDependencyImpact(kpi?.id, revisionOpen);
  /** Governance verdict modal — one at a time (approve KPI / approve formula / attest actual). */
  const [decision, setDecision] = useState<
    | { kind: 'submit-kpi' }
    | { kind: 'approve-kpi' }
    | { kind: 'approve-formula'; id: string; label: string }
    | { kind: 'attest'; id: string; periodId: string; label: string }
    | null
  >(null);
  /** Authoring modal — one at a time (edit KPI / new formula / set target / submit actual). */
  const [authoring, setAuthoring] = useState<null | 'edit-kpi' | 'new-formula' | 'set-target' | 'submit-actual'>(null);

  const roles = rolesQ.data ?? [];
  const canAuthor = roles.some((r) => (CREATE_ROLES as readonly string[]).includes(r));
  const canSubmitActual = roles.some((r) => (SUBMIT_ROLES as readonly string[]).includes(r));
  const canValidate = roles.some((r) => (VALIDATE_ROLES as readonly string[]).includes(r));

  const commentaryQ = useQuery({
    queryKey: ['strata', 'commentary', 'kpi', kpi?.id],
    queryFn: () => kpiApi.commentary('kpi', kpi!.id),
    enabled: !!kpi?.id,
    staleTime: STALE,
  });

  const achievement = (achievementQ.data ?? null) as KpiAchievementPayload | null;
  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const runKeyById = useMemo(() => {
    const m = new Map<string, string>();
    (uploadRunsQ.data ?? []).forEach((r) => m.set(r.id, r.run_key));
    return m;
  }, [uploadRunsQ.data]);

  /** Trend rows: targets ⋈ actuals on period_id — raw values only, no math. */
  const trendRows = useMemo<TrendRow[]>(() => {
    const targets = detailQ.data?.targets ?? [];
    const actuals = detailQ.data?.actuals ?? [];
    const targetByPeriod = new Map<string, StrataKpiTarget>();
    targets.forEach((t) => {
      const existing = targetByPeriod.get(t.period_id);
      if (!existing || (t.status === 'approved' && existing.status !== 'approved') ||
        (t.status === existing.status && t.version > existing.version)) {
        targetByPeriod.set(t.period_id, t);
      }
    });
    const actualByPeriod = new Map<string, StrataKpiActual>();
    // actuals arrive ordered by submitted_at desc — keep the latest per period.
    actuals.forEach((a) => { if (!actualByPeriod.has(a.period_id)) actualByPeriod.set(a.period_id, a); });
    const periodIds = new Set<string>([...targetByPeriod.keys(), ...actualByPeriod.keys()]);
    // F-9 provenance: attribute each point to the version that produced it, read from the row's own
    // kpi_id. The actual is preferred over the target because the actual IS the measurement.
    const versionByKpiId = new Map((detailQ.data?.versions ?? []).map((v) => [v.id, v]));
    return [...periodIds]
      .map((pid) => {
        const actual = actualByPeriod.get(pid) ?? null;
        const target = targetByPeriod.get(pid) ?? null;
        const owner = versionByKpiId.get(actual?.kpi_id ?? target?.kpi_id ?? '') ?? null;
        return {
          periodId: pid,
          period: periodById.get(pid) ?? null,
          target,
          actual,
          kpiVersion: owner?.version ?? null,
          revisionClass: owner?.revision_class ?? null,
        };
      })
      .sort((a, b) => (a.period?.starts_on ?? '').localeCompare(b.period?.starts_on ?? ''));
  }, [detailQ.data?.targets, detailQ.data?.actuals, detailQ.data?.versions, periodById]);

  /**
   * F-9 materiality — the shared rule (domain/materiality), not a local re-derivation. Scorecard
   * detail and board packs need the same answer (F-3), and surfaces that each decide "is this
   * comparable?" would disagree.
   */
  const breaks = useMemo(
    () => methodologyBreaks(trendRows.map((r) => ({
      kpiVersion: r.kpiVersion,
      revisionClass: r.revisionClass,
      label: r.period?.name ?? null,
    }))),
    [trendRows],
  );

  const chartData = useMemo(() => trendRows.map((r) => ({
    name: r.period?.name ?? '—',
    Target: r.target?.target ?? null,
    Actual: r.actual?.value ?? null,
  })), [trendRows]);

  const actualSpark = useMemo(() => trendRows.map((r) => r.actual?.value ?? null), [trendRows]);

  const trendColumns = useMemo<Column<TrendRow>[]>(() => [
    { id: 'period', label: 'Period', flex: true, cell: ({ row }) => (row.period?.name ? <span style={{ color: T.text }}>{row.period.name}</span> : <Dash />) },
    {
      // F-9: "non_material continuity retains EXACT provenance". The trend now spans versions, so
      // every point must say which definition produced it — otherwise a continuous line silently
      // mixes definitions. Zero-assumption: a point whose owning version cannot be resolved renders
      // a dash, never a guessed version.
      id: 'version',
      label: 'Version',
      width: 12,
      cell: ({ row }) => (row.kpiVersion === null
        ? <Dash />
        : (
          <span
            style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle }}
            data-testid={`strata-kpi-trend-version-${row.periodId}`}
          >
            v{row.kpiVersion}
            {row.revisionClass === 'material' ? ' ⚠' : ''}
          </span>
        )),
    },
    {
      id: 'target', label: 'Target', width: 18,
      cell: ({ row }) => (row.target ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(row.target.target, kpi?.unit)}</span> : <Dash />),
    },
    {
      id: 'actual', label: 'Actual', width: 18,
      cell: ({ row }) => (row.actual ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(row.actual.value, kpi?.unit)}</span> : <Dash />),
    },
    {
      id: 'validation', label: 'Validation', width: 16,
      cell: ({ row }) => (row.actual ? <ValidationLozenge status={row.actual.validation_status} /> : <Dash />),
    },
  ], [kpi?.unit]);

  // ── Per-period joins for the unified Actuals & validation table (anchor 06) ──
  const targetByPeriodId = useMemo(() => {
    const m = new Map<string, StrataKpiTarget>();
    (detailQ.data?.targets ?? []).forEach((t) => {
      const ex = m.get(t.period_id);
      if (!ex || (t.status === 'approved' && ex.status !== 'approved') || (t.status === ex.status && t.version > ex.version)) {
        m.set(t.period_id, t);
      }
    });
    return m;
  }, [detailQ.data?.targets]);
  const bandByPeriodId = useMemo(() => {
    const m = new Map<string, string | null>();
    (detailQ.data?.calc ?? []).forEach((cv) => {
      const c = cv as { period_id?: string | null; status_key?: string | null };
      if (c.period_id && !m.has(c.period_id)) m.set(c.period_id, c.status_key ?? null);
    });
    return m;
  }, [detailQ.data?.calc]);
  const commentaryByPeriodId = useMemo(() => {
    const m = new Map<string, string>();
    ((commentaryQ.data ?? []) as StrataCommentaryRow[]).forEach((c) => {
      const text = c.body ?? c.content ?? '';
      if (c.period_id && text && !m.has(c.period_id)) m.set(c.period_id, text);
    });
    return m;
  }, [commentaryQ.data]);

  // Anchor 06: Period · Actual · Target · Band · Validation · Commentary · Lineage —
  // commentary tied to its period (no orphaned commentary section).
  const actualsColumns = useMemo<Column<StrataKpiActual>[]>(() => [
    {
      id: 'period', label: 'Period', width: 14,
      cell: ({ row }) => (periodById.get(row.period_id)?.name
        ? <span style={{ color: T.text, fontWeight: 600 }}>{periodById.get(row.period_id)!.name}</span> : <Dash />),
    },
    {
      id: 'actual', label: 'Actual', width: 12,
      cell: ({ row }) => <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(row.value, kpi?.unit)}</span>,
    },
    {
      id: 'target', label: 'Target', width: 12,
      cell: ({ row }) => {
        const t = targetByPeriodId.get(row.period_id);
        return t ? <span style={{ color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(t.target, kpi?.unit)}</span> : <Dash />;
      },
    },
    {
      id: 'band', label: 'Band', width: 12,
      cell: ({ row }) => <StrataBandLozenge bandKey={bandByPeriodId.get(row.period_id) ?? null} />,
    },
    {
      id: 'validation', label: 'Validation', width: 18,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ValidationLozenge status={row.validation_status} />
          {row.validation_status === 'pending' && canValidate ? (
            <Button
              appearance="default"
              spacing="compact"
              onClick={() => setDecision({ kind: 'attest', id: row.id, periodId: row.period_id, label: periodById.get(row.period_id)?.name ?? '—' })}
              testId={`strata-validate-${row.id}`}
            >
              Validate
            </Button>
          ) : null}
        </span>
      ),
    },
    {
      id: 'commentary', label: 'Commentary', flex: true,
      cell: ({ row }) => {
        const c = commentaryByPeriodId.get(row.period_id);
        return c
          ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>{c}</span>
          : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'lineage', label: 'Lineage', width: 14,
      cell: ({ row }) => {
        const runKey = row.upload_run_id ? runKeyById.get(row.upload_run_id) ?? null : null;
        if (runKey) {
          return <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(runKey))}>{runKey}</Button>;
        }
        return row.entry_method
          ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{labelize(row.entry_method)}</span>
          : <Dash />;
      },
    },
  ], [periodById, targetByPeriodId, bandByPeriodId, commentaryByPeriodId, runKeyById, navigate, kpi?.unit, canValidate]);

  // ── Loading / error / not-found states ────────────────────────────────────
  const stateTrail = [{ text: 'KPI library', href: Routes.strata.kpis() }];
  if (kpiQ.isLoading) {
    return (
      <StrataPageShell trail={stateTrail} hideTitle testId="strata-kpi-detail-chrome">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" aria-label="Loading KPI" />
        </div>
      </StrataPageShell>
    );
  }
  if (kpiQ.isError) {
    return (
      <StrataPageShell trail={stateTrail} hideTitle testId="strata-kpi-detail-chrome">
        <SectionMessage appearance="error" title="Failed to load KPI">
          <p>{(kpiQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      </StrataPageShell>
    );
  }
  if (!kpi) {
    return (
      <StrataPageShell trail={stateTrail} hideTitle testId="strata-kpi-detail-chrome">
        <EmptyState
          header="KPI not found"
          description={`No KPI exists with slug "${slug ?? ''}".`}
          primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.strata.kpis())}>Back to KPI library</Button>}
        />
      </StrataPageShell>
    );
  }

  const elements = elementsQ.data ?? [];
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const perspectiveById = new Map((perspectivesQ.data ?? []).map((p) => [p.id, p.name]));
  const kpiElementLinks = (elementKpisQ.data ?? []).filter((l) => l.kpi_id === kpi.id);
  const actuals = detailQ.data?.actuals ?? [];
  const formulas = detailQ.data?.formulas ?? [];
  const lineageActuals = actuals.filter((a) => a.upload_run_id);
  const manualActuals = actuals.filter((a) => a.entry_method === 'manual');
  const confidenceText = fmtConfidence(achievement?.confidence);
  const lineageFootnote = [
    lineageActuals.length > 0 ? 'Uploaded values trace to a staging row inside their upload run.' : null,
    manualActuals.length > 0 ? 'Manual entries carry submitter attestation.' : null,
  ].filter(Boolean).join(' ');

  // ── Verdict-band + chain/trust inputs (anchor 06) ─────────────────────────
  const chain = (chainQ.data ?? {}) as {
    elements?: Array<{ id: string; name: string; element_type?: string }>;
    projects?: Array<{ id: string; name: string; blocked_dependencies?: number }>;
    benefits?: Array<{ id: string; name: string }>;
    formula_version?: { version?: number; formula_type?: string } | null;
  };
  // Current-period actual (actuals ordered submitted_at desc → first match is latest).
  const currentActual = actuals.find((a) => a.period_id === activePeriod?.id) ?? null;
  // Δ vs the prior period's actual (trendRows ascending by starts_on).
  const curTrendIdx = trendRows.findIndex((r) => r.periodId === activePeriod?.id);
  const prevActualRow = curTrendIdx > 0 ? trendRows[curTrendIdx - 1] : null;
  const actualDelta = achievement?.actual != null && prevActualRow?.actual?.value != null
    ? achievement.actual - prevActualRow.actual.value : null;
  const chainSegments: StrataChainSegment[] = [
    {
      icon: '↑', label: 'Objective',
      items: (chain.elements ?? [])
        .filter((e) => e.element_type === 'objective' || e.element_type === 'theme')
        .map((e) => {
          const elSlug = elementById.get(e.id)?.slug ?? null;
          return { name: e.name, onNav: elSlug ? () => navigate(Routes.strata.strategyElement(elSlug)) : undefined };
        }),
      emptyText: 'No linked objective',
    },
    {
      icon: '▦', label: 'Delivery',
      items: (chain.projects ?? []).map((p) => ({
        name: p.name,
        meta: (p.blocked_dependencies ?? 0) > 0 ? `${p.blocked_dependencies} blocked` : undefined,
        tone: (p.blocked_dependencies ?? 0) > 0 ? ('danger' as const) : undefined,
      })),
      emptyText: 'No linked project cards',
    },
    {
      icon: '◇', label: 'Value',
      items: (chain.benefits ?? []).map((b) => ({ name: b.name })),
      emptyText: 'No linked benefits',
    },
  ];

  return (
    <StrataPageShell
      trail={[{ text: 'KPI library', href: Routes.strata.kpis() }]}
      title={kpi.name}
      docTitle={kpi.name}
      testId="strata-kpi-detail-chrome"
      headerActions={
        <>
          {kpi.slug ? (
            <Button
              appearance="default"
              iconBefore={<Info size={14} />}
              onClick={() => navigate(Routes.strata.kpiEvidence(kpi.slug!))}
              testId="strata-kpi-evidence"
            >
              Evidence
            </Button>
          ) : null}
          {canAuthor && (kpi.status === 'draft' || kpi.status === 'pending_approval') ? (
            <Button
              appearance="default"
              onClick={() => setAuthoring('edit-kpi')}
              testId="strata-kpi-edit"
            >
              Edit KPI
            </Button>
          ) : null}
          {canAuthor && kpi.status === 'draft' ? (
            // KO-DEF-001: blocked while prerequisites remain, so a KPI can no longer reach
            // Pending Approval only to fail approval later on the first unmet gate.
            <Button
              appearance="primary"
              isDisabled={blockersQ.isLoading || submitBlockers.length > 0}
              onClick={() => setDecision({ kind: 'submit-kpi' })}
              testId="strata-kpi-submit"
            >
              Submit for approval
            </Button>
          ) : null}
          {kpi.status === 'pending_approval' ? (
            <Button
              appearance="primary"
              onClick={() => setDecision({ kind: 'approve-kpi' })}
              testId="strata-kpi-approve"
            >
              Approve KPI
            </Button>
          ) : null}
          {/* KO-DEF-002 — the only governed way to change an Approved definition (D-3: a new
              draft version, never in-place mutation). The predecessor stays Approved and
              immutable; this creates vNext on the same lineage. */}
          {canAuthor && kpi.status === 'approved' ? (
            <Button
              onClick={() => setRevisionOpen(true)}
              testId="strata-kpi-new-version"
            >
              Create new version
            </Button>
          ) : null}
          {canAuthor && kpi.status === 'approved' ? (
            <Button onClick={() => setRetireOpen(true)} testId="strata-kpi-retire">Retire KPI</Button>
          ) : null}
        </>
      }
      extra={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <StrataGovernedStatusLozenge status={kpi.status} />
          {kpi.is_strategic ? <CatalystTag text="Strategic" /> : null}
          {kpi.unit ? <CatalystTag text={kpi.unit} /> : null}
          <CatalystTag text={DIRECTION_LABEL[kpi.direction] ?? labelize(kpi.direction)} />
          {kpi.frequency ? <CatalystTag text={labelize(kpi.frequency)} /> : null}
        </span>
      }
    >

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KO-DEF-001 — the COMPLETE prerequisite list, before submission rather than one failed
            approval at a time. Rendered from strata_kpi_submission_blockers, the same function the
            submit gate enforces, so this list is exactly what the server will check. */}
        {kpi.status === 'draft' && submitBlockers.length > 0 ? (
          <SectionMessage
            appearance="warning"
            title={`Not ready to submit — ${submitBlockers.length} prerequisite${submitBlockers.length === 1 ? '' : 's'} outstanding`}
          >
            <p style={{ margin: '0 0 8px' }}>
              Submit for approval is disabled until every prerequisite below is met. The server enforces
              the same list.
            </p>
            <ul style={{ margin: 0, paddingLeft: 'var(--ds-space-250)' }} data-testid="strata-kpi-submit-blockers">
              {submitBlockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </SectionMessage>
        ) : null}
        {/* STRATA-E2E-010: a strategic KPI with no governed association can't be approved. */}
        {kpi.is_strategic && kpi.status !== 'approved' && kpiElementLinks.length === 0 ? (
          <SectionMessage appearance="warning" title="Strategy association required">
            <p style={{ margin: 0 }}>
              This Strategic KPI has no governed strategy association. Link it to a theme or
              objective (which carries its cycle, objective and perspective) before it can be
              submitted for approval.
            </p>
          </SectionMessage>
        ) : null}
        {/* Verdict (5fr) + Trend (7fr) — verdict-first order (anchor 06) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 16 }}>
          <section
            data-testid="strata-kpi-verdict"
            style={{
              border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised,
              boxShadow: 'var(--ds-shadow-raised)', padding: 'var(--ds-space-250)',
              display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)', minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest }}>
                {`${activePeriod?.name ?? '—'} verdict`.toUpperCase()}
              </span>
              <StrataBandLozenge bandKey={achievement?.status_key ?? null} />
              {currentActual ? <ValidationLozenge status={currentActual.validation_status} /> : null}
            </div>
            {achievement?.actual != null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 'var(--ds-font-size-700)', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {fmtUnit(achievement.actual, kpi.unit)}
                </span>
                {achievement.target != null ? (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
                    vs target <strong style={{ color: T.text, fontWeight: 600 }}>{fmtUnit(achievement.target, kpi.unit)}</strong>
                  </span>
                ) : null}
                {actualDelta != null && Math.abs(actualDelta) > 0.0001 ? (
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: actualDelta >= 0 ? 'var(--ds-text-success)' : 'var(--ds-text-danger)' }}>
                    {`${actualDelta >= 0 ? '▲' : '▼'} ${fmtUnit(Math.abs(actualDelta), kpi.unit)} vs ${prevActualRow?.period?.name ?? 'prior'}`}
                  </span>
                ) : null}
              </div>
            ) : (
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>No actual submitted for this period.</span>
            )}
            {achievement?.achievement != null ? (
              <div style={{ marginTop: 'var(--ds-space-050)' }}>
                <StrataBandBar value={achievement.achievement} bandKey={achievement.status_key} height={8} />
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              {achievement?.achievement != null ? <span>{`Achievement ${fmtPct(achievement.achievement)}`}</span> : null}
              {confidenceText ? <span>{`Confidence ${confidenceText}`}</span> : null}
              {chain.formula_version ? (
                <span style={{ marginLeft: 'auto' }}>
                  {`Formula ${labelize(chain.formula_version.formula_type ?? '')}${chain.formula_version.version != null ? ` v${chain.formula_version.version}` : ''}`}
                </span>
              ) : null}
            </div>
          </section>

          {/* (c) Trend */}
        <StrataPanel
          title="Trend"
          icon={<Activity size={16} />}
          count={trendRows.length || null}
          testId="strata-kpi-trend"
          actions={
            <>
              {trendRows.length > 0 ? (
                <Button appearance="subtle" spacing="compact" onClick={() => setShowTrendData((v) => !v)}>
                  {showTrendData ? 'Hide data' : 'Show data'}
                </Button>
              ) : null}
              {canAuthor ? (
                <Button appearance="default" spacing="compact" onClick={() => setAuthoring('set-target')} testId="strata-kpi-set-target">
                  Set target
                </Button>
              ) : null}
            </>
          }
        >
          {/* F-9: a material revision breaks comparability, so the trend must SAY SO rather than
              draw one continuous line across two different definitions. Shown above the chart
              because it changes how every point after the break should be read. Only `material`
              raises it — `non_material` is permitted to trend continuously, with the Version column
              carrying the exact provenance. */}
          {breaks.length > 0 ? (
            <div style={{ marginBottom: 12 }} data-testid="strata-kpi-methodology-break">
              <SectionMessage appearance="warning" title="Methodology break — values are not directly comparable">
                <p>
                  {breaks.map((b) => `v${b.version} (from ${b.label})`).join(", ")}
                  {breaks.length > 1 ? ' introduced material changes' : ' introduced a material change'}
                  {' '}to how this KPI is measured — its formula, unit, direction, scope or source semantics.
                  Points before and after are measured differently and should not be read as one trend
                  without an approved bridge.
                </p>
              </SectionMessage>
            </div>
          ) : null}
          {detailQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading trend" />
          ) : detailQ.isError ? (
            <SectionMessage appearance="error" title="Failed to load trend data">
              <p>{(detailQ.error as Error)?.message ?? 'Unknown error'}</p>
            </SectionMessage>
          ) : trendRows.length === 0 ? (
            <EmptyState size="compact" header="No targets or actuals yet" description="Targets and validated actuals will chart here by period." />
          ) : (
            <>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--ds-text-subtle)', fontSize: 12 }} stroke="var(--ds-border)" />
                    <YAxis
                      tick={{ fill: 'var(--ds-text-subtle)', fontSize: 12 }}
                      stroke="var(--ds-border)"
                      label={kpi.unit ? {
                        value: kpi.unit, angle: -90, position: 'insideLeft',
                        style: { fill: 'var(--ds-text-subtlest)', fontSize: 11 },
                      } : undefined}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'var(--ds-surface-overlay)', border: '1px solid var(--ds-border)',
                        borderRadius: 4, color: 'var(--ds-text)', fontSize: 12,
                      }}
                      formatter={(value: number | string) => fmtUnit(typeof value === 'number' ? value : Number(value), kpi.unit)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ds-text-subtle)' }} />
                    <Line type="monotone" dataKey="Target" stroke="var(--ds-border-bold)" strokeDasharray="4 4" strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="Actual" stroke="var(--ds-text-brand)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {showTrendData ? (
                <div style={{ marginTop: 12 }}>
                  <JiraTable<TrendRow>
                    columns={trendColumns}
                    data={trendRows}
                    getRowId={(row) => row.periodId}
                    density="compact"
                    showRowCount={false}
                    rowsPerPage={100}
                    ariaLabel="Trend data"
                  />
                </div>
              ) : null}
            </>
          )}
        </StrataPanel>
        </div>

        {/* Chain strip (7fr) + Trust strip (5fr) — trust follows verdict (anchor 06) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)', gap: 16 }}>
          <StrataChainStrip segments={chainSegments} testId="strata-kpi-chain" />
          <div
            data-testid="strata-kpi-trust"
            style={{
              border: `1px solid ${T.border}`, borderRadius: 8, background: T.sunken,
              padding: 'var(--ds-space-150) var(--ds-space-200)', minWidth: 0,
            }}
          >
            <div style={{ fontSize: 'var(--ds-font-size-050)', fontWeight: 700, letterSpacing: '0.06em', color: T.subtlest, marginBottom: 'var(--ds-space-075)' }}>
              TRUST
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
              <span>Source · <strong style={{ color: T.text, fontWeight: 600 }}>{currentActual?.entry_method ? labelize(currentActual.entry_method) : '—'}</strong></span>
              <span>
                Last run · {currentActual?.upload_run_id && runKeyById.get(currentActual.upload_run_id)
                  ? <strong style={{ color: T.text, fontWeight: 600 }}>{runKeyById.get(currentActual.upload_run_id)}</strong>
                  : '—'}
              </span>
              <span>
                Formula · <strong style={{ color: T.text, fontWeight: 600 }}>
                  {chain.formula_version ? `${labelize(chain.formula_version.formula_type ?? '')}${chain.formula_version.version != null ? ` v${chain.formula_version.version}` : ''}` : '—'}
                </strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                Validation · {currentActual
                  ? <ValidationLozenge status={currentActual.validation_status} />
                  : <span style={{ color: T.subtlest }}>no actual this period</span>}
              </span>
            </div>
          </div>
        </div>

        {/* (d) Ownership — after the hero (S-147) */}
        <StrataPanel title="Ownership" icon={<Users size={16} />} testId="strata-kpi-ownership">
          <div>
            {OWNERSHIP_ROLES.map(({ label, key }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ width: 160, flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{label}</span>
                <PersonName id={kpi[key]} profiles={profilesQ.data} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '8px 0 0' }}>
            Submitter and validator are always different people.
          </p>
        </StrataPanel>

        {/* (e) Formula versions */}
        <StrataPanel
          title="Formula versions"
          icon={<GitBranch size={16} />}
          count={formulas.length || null}
          testId="strata-kpi-formulas"
          actions={canAuthor ? (
            <Button appearance="default" spacing="compact" onClick={() => setAuthoring('new-formula')} testId="strata-kpi-new-formula">
              New formula version
            </Button>
          ) : undefined}
        >
          {detailQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading formulas" />
          ) : formulas.length === 0 ? (
            <EmptyState size="compact" header="No formula versions" description="Governed formula versions will appear here once defined." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {formulas.map((f) => (
                <div key={f.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <Lozenge appearance="inprogress" isBold>{`v${f.version}`}</Lozenge>
                    <CatalystTag text={labelize(f.formula_type)} />
                    <StrataGovernedStatusLozenge status={f.status} />
                    {f.status === 'pending_approval' ? (
                      <Button
                        appearance="default"
                        spacing="compact"
                        onClick={() => setDecision({ kind: 'approve-formula', id: f.id, label: `v${f.version}` })}
                        testId={`strata-formula-approve-${f.id}`}
                      >
                        Approve
                      </Button>
                    ) : null}
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginLeft: 'auto' }}>
                      Effective from {fmtDate(f.effective_from)} · Approved {fmtDate(f.approved_at)}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0, padding: '8px 12px', background: T.sunken, borderRadius: 4,
                      fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', color: T.text,
                      whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    }}
                  >
                    {f.expression}
                  </pre>
                </div>
              ))}
              <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: 0 }}>
                Every formula change creates a new approved version.
              </p>
            </div>
          )}
        </StrataPanel>

        {/* (e2) Strategy links — element↔KPI join rows (strata_element_kpis), approved-gated */}
        <StrataPanel
          title="Strategy links"
          icon={<Network size={16} />}
          count={kpiElementLinks.length || null}
          testId="strata-kpi-strategy-links"
          actions={canAuthor ? (
            <Button
              appearance="default"
              spacing="compact"
              onClick={() => setShowStrategyLinks(true)}
              testId="strata-kpi-manage-strategy-links"
            >
              Manage links
            </Button>
          ) : undefined}
        >
          {elementsQ.isLoading || elementKpisQ.isLoading ? (
            <Spinner size="medium" aria-label="Loading strategy links" />
          ) : kpiElementLinks.length === 0 ? (
            <EmptyState size="compact" header="No strategy links" description="Link this KPI to a strategy theme or objective to roll it into the hierarchy." />
          ) : (
            <div>
              {kpiElementLinks.map((l) => {
                const el = elementById.get(l.element_id);
                return (
                  <div key={l.element_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {el?.name ?? <Dash />}
                    </span>
                    {el?.element_type ? <CatalystTag text={labelize(el.element_type)} /> : null}
                    {/* STRATA-E2E-010: governed perspective this link rolls the KPI into.
                        Rendered only once resolved — zero-assumption, no placeholder guess. */}
                    {el?.perspective_id && perspectiveById.get(el.perspective_id)
                      ? <CatalystTag text={perspectiveById.get(el.perspective_id)!} />
                      : null}
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
                      {l.weight != null ? `Weight ${l.weight}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </StrataPanel>

        {/* (f) Actuals & validation — commentary is a column, not an orphaned panel (anchor 06) */}
        <StrataPanel
          title="Actuals & validation"
          icon={<Database size={16} />}
          count={actuals.length || null}
          testId="strata-kpi-actuals"
          noPadding
          actions={canSubmitActual ? (
            <Button appearance="default" spacing="compact" onClick={() => setAuthoring('submit-actual')} testId="strata-kpi-submit-actual">
              Submit actual
            </Button>
          ) : undefined}
        >
          {detailQ.isLoading ? (
            <div style={{ padding: 16 }}><Spinner size="medium" aria-label="Loading lineage" /></div>
          ) : actuals.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState size="compact" header="No actuals recorded" description="Uploaded and manual actuals with full lineage will appear here." />
            </div>
          ) : (
            <>
              <JiraTable<StrataKpiActual>
                columns={actualsColumns}
                data={actuals}
                getRowId={(row) => row.id}
                density="compact"
                showRowCount={false}
                rowsPerPage={100}
                ariaLabel="Actuals and validation"
              />
              {lineageFootnote ? (
                <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: 0, padding: '8px 16px 12px' }}>
                  {lineageFootnote}
                </p>
              ) : null}
            </>
          )}
        </StrataPanel>

      </div>

      {/* KO-DEF-002 — Draft vNext from an Approved KPI. Reuses strata_create_kpi_draft_version:
          same lineage, version = max+1, supersedes_id set, definition children (formula versions)
          cloned, and NO actuals / targets / Key Results / Scorecard lines / links copied. The
          Approved predecessor is never mutated — server-enforced; the modal only collects the
          governed reason and materiality it requires. */}
      {retireOpen ? (
        <RetireKpiModal
          kpi={kpi}
          onClose={() => setRetireOpen(false)}
          onDone={() => { setRetireOpen(false); invalidate(); }}
        />
      ) : null}

      {revisionOpen ? (
        <StrataFormModal
          open
          onClose={() => setRevisionOpen(false)}
          title="Create new KPI version"
          description={(
            <div style={{ display: 'grid', gap: 12 }}>
              <span>
                Creates <strong>v{(kpi.version ?? 1) + 1}</strong> of “{kpi.name}” as a Draft on the same
                lineage. <strong>v{kpi.version ?? 1} stays Approved and unchanged</strong>, and keeps every
                actual, target and historical fact already recorded against it. The new version takes
                effect only once approved.
              </span>
              <DependencyImpactList impact={revisionImpactQ.data} loading={revisionImpactQ.isLoading} />
            </div>
          )}
          fields={[
            {
              key: 'reason', label: 'Change reason', kind: 'textarea', required: true,
              helper: 'Recorded on the version and in the audit trail',
            },
            {
              key: 'revisionClass', label: 'Materiality', kind: 'select', required: true,
              options: [
                { value: 'non_material', label: 'Non-material — wording, owner or metadata only' },
                { value: 'material', label: 'Material — formula, unit, direction, scope or source semantics (breaks comparability)' },
              ],
            },
            {
              key: 'effectiveFrom', label: 'Prospective adoption date', kind: 'date',
              helper: 'Optional — leave blank to adopt on approval. A future date defers adoption.',
            },
          ]}
          submitLabel="Create draft version"
          testId="strata-kpi-new-version-modal"
          onSubmit={async (v) => {
            await configApi.createKpiDraftVersion(
              kpi.id, String(v.reason), v.revisionClass as 'non_material' | 'material',
              (v.effectiveFrom as string | null) || null,
            );
            invalidate();
          }}
        />
      ) : null}

      {/* Governance verdict modals — RPC-enforced SoD; errors render in-modal */}
      <StrataDecisionModal
        open={decision?.kind === 'submit-kpi'}
        onClose={() => setDecision(null)}
        title="Submit KPI for approval"
        description={`Submit “${kpi.name}” for governed approval. It moves to Pending Approval; a separate approver then approves it (segregation of duties is enforced by the server).`}
        options={[{ value: 'submitted', label: 'Submit' }]}
        confirmLabel="Submit"
        onConfirm={async () => {
          await configApi.submitRecord('strata_kpis', kpi.id);
          invalidate();
        }}
        testId="strata-kpi-submit-modal"
      />
      <StrataDecisionModal
        open={decision?.kind === 'approve-kpi'}
        onClose={() => setDecision(null)}
        title="Approve KPI"
        description={`Approve “${kpi.name}” for governed use. Segregation of duties is enforced by the server.`}
        options={[{ value: 'approved', label: 'Approve' }]}
        confirmLabel="Approve"
        onConfirm={async (_verdict, note) => {
          await kpiApi.approveKpi(kpi.id, note || undefined);
          invalidate();
        }}
        testId="strata-kpi-approve-modal"
      />
      <StrataDecisionModal
        open={decision?.kind === 'approve-formula'}
        onClose={() => setDecision(null)}
        title={`Approve formula ${decision?.kind === 'approve-formula' ? decision.label : ''}`}
        description="Approving activates this formula version for the calc engine."
        options={[{ value: 'approved', label: 'Approve' }]}
        confirmLabel="Approve"
        onConfirm={async (_verdict, note) => {
          if (decision?.kind !== 'approve-formula') return;
          await kpiApi.approveFormulaVersion(decision.id, note || undefined);
          invalidate();
        }}
        testId="strata-formula-approve-modal"
      />
      <StrataDecisionModal
        open={decision?.kind === 'attest'}
        onClose={() => setDecision(null)}
        title={`Attest actual · ${decision?.kind === 'attest' ? decision.label : ''}`}
        description="Validation verdicts are recorded with full audit lineage. The submitter cannot attest their own value."
        options={[
          { value: 'validated', label: 'Validate' },
          { value: 'rejected', label: 'Reject', appearance: 'danger' },
          { value: 'quarantined', label: 'Quarantine' },
        ]}
        onConfirm={async (verdict, note) => {
          if (decision?.kind !== 'attest') return;
          await kpiApi.attestActual(decision.id, verdict as 'validated' | 'rejected' | 'quarantined', note || undefined);
          // A validated actual changes the governed calc — refresh it server-side before refetching.
          if (verdict === 'validated') {
            await kpiApi.achievement(kpi.id, decision.periodId);
          }
          invalidate();
        }}
        testId="strata-attest-modal"
      />

      {/* Authoring modals — server RPCs validate (SoD, band rules, closed periods); errors render in-modal */}
      <StrataFormModal
        open={authoring === 'edit-kpi'}
        onClose={() => setAuthoring(null)}
        title="Edit KPI"
        description="Updates the draft KPI definition. Segregation of duties (e.g. validator ≠ owner) is enforced by the server."
        width="large"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
          { key: 'frequency', label: 'Frequency', kind: 'select', options: FREQUENCY_OPTIONS },
          { key: 'entryMethod', label: 'Entry method', kind: 'select', options: ENTRY_METHOD_OPTIONS },
          { key: 'accountableOwnerId', label: 'Accountable owner', kind: 'user' },
          { key: 'dataOwnerId', label: 'Data owner', kind: 'user' },
          { key: 'reporterId', label: 'Reporter', kind: 'user' },
          { key: 'validatorId', label: 'Validator', kind: 'user', helper: 'Must differ from the submitter — enforced server-side' },
          { key: 'escalationOwnerId', label: 'Escalation owner', kind: 'user' },
          {
            key: 'dataSourceId', label: 'Data source', kind: 'select',
            options: (dataSourcesQ.data ?? []).map((d) => ({ value: d.id, label: d.name })),
          },
          {
            key: 'thresholdSchemeId', label: 'Threshold scheme', kind: 'select',
            options: (schemesQ.data ?? []).map((s) => ({ value: s.id, label: s.name })),
          },
          {
            key: 'kpiTypeId', label: 'KPI type', kind: 'select',
            options: (kpiTypesQ.data ?? []).map((t) => ({ value: t.id, label: t.name })),
          },
          { key: 'isStrategic', label: 'Strategic KPI', kind: 'checkbox', helper: 'Requires a governed strategy association (cycle/theme/objective/perspective) before approval' },
        ]}
        initial={{
          name: kpi.name, unit: kpi.unit, direction: kpi.direction, frequency: kpi.frequency,
          entryMethod: kpi.entry_method,
          accountableOwnerId: kpi.accountable_owner_id, dataOwnerId: kpi.data_owner_id,
          reporterId: kpi.reporter_id, validatorId: kpi.validator_id,
          escalationOwnerId: kpi.escalation_owner_id,
          dataSourceId: kpi.data_source_id, thresholdSchemeId: kpi.threshold_scheme_id,
          kpiTypeId: kpi.kpi_type_id, isStrategic: kpi.is_strategic,
        }}
        submitLabel="Save KPI"
        onSubmit={async (v) => {
          await kpiApi.updateKpi(kpi.id, {
            name: v.name ? String(v.name) : undefined,
            unit: v.unit ? String(v.unit) : undefined,
            direction: v.direction ? String(v.direction) : undefined,
            frequency: v.frequency ? String(v.frequency) : undefined,
            entryMethod: v.entryMethod ? String(v.entryMethod) : undefined,
            accountableOwnerId: v.accountableOwnerId ? String(v.accountableOwnerId) : undefined,
            dataOwnerId: v.dataOwnerId ? String(v.dataOwnerId) : undefined,
            reporterId: v.reporterId ? String(v.reporterId) : undefined,
            validatorId: v.validatorId ? String(v.validatorId) : undefined,
            escalationOwnerId: v.escalationOwnerId ? String(v.escalationOwnerId) : undefined,
            dataSourceId: v.dataSourceId ? String(v.dataSourceId) : undefined,
            thresholdSchemeId: v.thresholdSchemeId ? String(v.thresholdSchemeId) : undefined,
            kpiTypeId: v.kpiTypeId ? String(v.kpiTypeId) : undefined,
            isStrategic: v.isStrategic != null ? Boolean(v.isStrategic) : undefined,
            // Clear affordances: the field opened with a value and the user emptied it.
            clearValidator: wasCleared(kpi.validator_id, v.validatorId),
            clearDataSource: wasCleared(kpi.data_source_id, v.dataSourceId),
            clearEscalationOwner: wasCleared(kpi.escalation_owner_id, v.escalationOwnerId),
          });
          invalidate();
        }}
        testId="strata-kpi-edit-modal"
      />
      <StrataFormModal
        open={authoring === 'new-formula'}
        onClose={() => setAuthoring(null)}
        title="New formula version"
        description="Creates a pending version. It only drives the calc engine after governed approval."
        fields={[
          { key: 'expression', label: 'Expression', kind: 'textarea', required: true, placeholder: 'e.g. actual / target' },
          {
            key: 'formulaType', label: 'Formula type', kind: 'select',
            options: [...new Set([...FORMULA_TYPE_BASE, ...formulas.map((f) => f.formula_type)])]
              .map((t) => ({ value: t, label: labelize(t) })),
          },
          { key: 'changeReason', label: 'Change reason', kind: 'textarea', placeholder: 'Why is the formula changing?' },
        ]}
        initial={{ formulaType: 'ratio_to_target' }}
        submitLabel="Create version"
        onSubmit={async (v) => {
          await kpiApi.createFormulaVersion({
            kpiId: kpi.id,
            expression: String(v.expression),
            formulaType: v.formulaType ? String(v.formulaType) : undefined,
            changeReason: v.changeReason ? String(v.changeReason) : undefined,
          });
          invalidate();
        }}
        testId="strata-kpi-new-formula-modal"
      />
      <StrataFormModal
        open={authoring === 'set-target'}
        onClose={() => setAuthoring(null)}
        title="Set target"
        description="Records a governed target for a period. Band bounds are required by the server for band-type targets."
        fields={[
          {
            key: 'periodId', label: 'Period', kind: 'select', required: true,
            options: periods.map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'target', label: 'Target', kind: 'number', required: true },
          { key: 'baseline', label: 'Baseline', kind: 'number' },
          { key: 'tolerance', label: 'Tolerance', kind: 'number' },
          { key: 'bandMin', label: 'Band min', kind: 'number', helper: 'Required for band targets' },
          { key: 'bandMax', label: 'Band max', kind: 'number', helper: 'Required for band targets' },
          { key: 'targetType', label: 'Target type', kind: 'select', options: TARGET_TYPE_OPTIONS },
        ]}
        initial={{ periodId: activePeriod?.id ?? null, targetType: 'point' }}
        submitLabel="Set target"
        onSubmit={async (v) => {
          await kpiApi.createTarget({
            kpiId: kpi.id,
            periodId: String(v.periodId),
            target: Number(v.target),
            baseline: v.baseline != null ? Number(v.baseline) : undefined,
            tolerance: v.tolerance != null ? Number(v.tolerance) : undefined,
            bandMin: v.bandMin != null ? Number(v.bandMin) : undefined,
            bandMax: v.bandMax != null ? Number(v.bandMax) : undefined,
            targetType: v.targetType ? (String(v.targetType) as 'point' | 'band' | 'milestone') : undefined,
          });
          invalidate();
        }}
        testId="strata-kpi-set-target-modal"
      />
      <StrataFormModal
        open={authoring === 'submit-actual'}
        onClose={() => setAuthoring(null)}
        title="Submit actual"
        description="Submits a manual actual as pending. It becomes canonical only after a different person attests it."
        fields={[
          {
            key: 'periodId', label: 'Period', kind: 'select', required: true,
            options: periods.map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'value', label: 'Value', kind: 'number', required: true },
          { key: 'note', label: 'Commentary', kind: 'textarea', placeholder: 'Context for the validator' },
          { key: 'confidence', label: 'Confidence (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
        ]}
        initial={{ periodId: activePeriod?.id ?? null }}
        submitLabel="Submit actual"
        onSubmit={async (v) => {
          await kpiApi.submitActual({
            kpiId: kpi.id,
            periodId: String(v.periodId),
            value: Number(v.value),
            note: v.note ? String(v.note) : undefined,
            confidence: v.confidence != null ? Number(v.confidence) : undefined,
          });
          invalidate();
        }}
        testId="strata-kpi-submit-actual-modal"
      />

      {/* Strategy links — KPI-first element linking; server enforces the approved gate + SoD */}
      {showStrategyLinks ? (
        <KpiStrategyLinksModal
          kpi={kpi}
          links={kpiElementLinks}
          elements={elements}
          // Strategic KPIs may link while draft/pending (to satisfy the approval gate);
          // operational KPIs keep the approved-only rule. Mirrors strata_link_element_kpi.
          canLink={kpi.status === 'approved' || (kpi.is_strategic && (kpi.status === 'draft' || kpi.status === 'pending_approval'))}
          onClose={() => setShowStrategyLinks(false)}
          onChanged={invalidate}
        />
      ) : null}
    </StrataPageShell>
  );
}
