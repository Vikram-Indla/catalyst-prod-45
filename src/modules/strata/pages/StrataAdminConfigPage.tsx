/**
 * STRATA Admin — Configuration Engine (governed control plane, not CRUD).
 * Routes: /strata/admin and /strata/admin/:section.
 * Every governed record shows its governance envelope (version, status,
 * effective date, approval, change reason). Lifecycle transitions are
 * RPC-only — the DB enforces roles + segregation of duties; DB error text
 * is surfaced verbatim.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  Button, CatalystInlineCode, CatalystTag, EmptyState, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, SectionMessage, Spinner, Textfield,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  BarChart3, CheckCircle2, Clock, Gem, GitBranch, Layers, ListChecks,
  MoveRight, Scale, Settings2, ShieldCheck, Upload, Users,
} from '@/lib/atlaskit-icons';
import { configApi } from '@/modules/strata/domain';
import {
  useChangeRequests, useGateModels, useInvalidateStrata, useKpiTypes, useModelPerspectives,
  usePerspectives, useScorecardModels, useStrataAudit, useStrataRoles, useThresholdSchemes,
  useUploadTemplates, useValueCategories, useWorkflowConfigs,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageChrome, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  GovernedEnvelope, GovernedStatus, StrataChangeRequest, StrataRole, StrataScorecardModel,
} from '@/modules/strata/types';

type OnError = (msg: string | null) => void;

// ── Shared bits ──────────────────────────────────────────────────────────────
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '0 0 12px' };
const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const codeStyle: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', color: T.subtlest,
};

const GOV_LOZENGE: Record<GovernedStatus, LozengeAppearance> = {
  approved: 'success', draft: 'default', pending_approval: 'moved', retired: 'removed', superseded: 'removed',
};

/** Governed directionality → executive-readable label (not naive labelize). */
const DIRECTIONALITY_LABEL: Record<string, string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
  band: 'Band',
  manual: 'Manual',
};

function GovStatusLozenge({ status }: { status: GovernedStatus }) {
  return <StatusLozenge status={status} label={labelize(status)} appearance={GOV_LOZENGE[status] ?? 'default'} />;
}

/** The governance envelope — shown prominently on every governed record. */
function GovEnvelope({ r }: { r: GovernedEnvelope }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <CatalystTag text={`v${r.version}`} />
      <GovStatusLozenge status={r.status} />
      <span style={metaStyle}>Effective {fmtDate(r.effective_from)}</span>
      {r.approved_at ? <span style={metaStyle}>Approved {fmtDate(r.approved_at)}</span> : null}
      {r.change_reason ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.change_reason}</span>
      ) : null}
    </div>
  );
}

/** Governance lifecycle actions — RPC-only; DB errors surface verbatim. */
function GovActions({ table, record, isScorecardModel, onError }: {
  table: string;
  record: { id: string; status: GovernedStatus };
  isScorecardModel?: boolean;
  onError: OnError;
}) {
  const invalidate = useInvalidateStrata();
  const [busy, setBusy] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    onError(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  if (record.status === 'draft') {
    return (
      <Button spacing="compact" isDisabled={busy} onClick={() => void act(() => configApi.submitRecord(table, record.id))}>
        Submit for approval
      </Button>
    );
  }
  if (record.status === 'pending_approval') {
    return (
      <Button
        spacing="compact"
        appearance="default"
        iconBefore={<CheckCircle2 size={14} />}
        isDisabled={busy}
        onClick={() => void act(() =>
          isScorecardModel ? configApi.approveScorecardModel(record.id) : configApi.approveRecord(table, record.id))}
      >
        Approve
      </Button>
    );
  }
  if (record.status === 'approved') {
    return (
      <>
        <Button spacing="compact" isDisabled={busy} onClick={() => { setRetireReason(''); setRetireOpen(true); }}>
          Retire
        </Button>
        <Modal isOpen={retireOpen} onClose={() => setRetireOpen(false)} width="small">
          <ModalHeader>
            <ModalTitle>Retire record</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
              Retiring is a governed lifecycle change — the reason is recorded in the audit trail.
            </p>
            <Textfield
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              placeholder="Retirement reason"
              aria-label="Retirement reason"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setRetireOpen(false)}>Cancel</Button>
            <Button
              appearance="warning"
              isDisabled={busy}
              onClick={() => {
                setRetireOpen(false);
                void act(() => configApi.retireRecord(table, record.id, retireReason || undefined));
              }}
            >
              Retire record
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }
  return null;
}

/** Card wrapper for one governed record: name + envelope + lifecycle actions. */
function GovRecordCard({ name, table, record, isScorecardModel, onError, children }: {
  name: string;
  table: string;
  record: GovernedEnvelope & { id: string };
  isScorecardModel?: boolean;
  onError: OnError;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`, borderRadius: 8, padding: 12,
        background: T.raised, boxShadow: 'var(--ds-shadow-raised)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{name}</strong>
        <GovActions table={table} record={record} isScorecardModel={isScorecardModel} onError={onError} />
      </div>
      <GovEnvelope r={record} />
      {children}
    </div>
  );
}

function SectionState({ query, empty, emptyLabel, children }: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (query.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>;
  }
  if (query.isError) {
    return (
      <SectionMessage appearance="error" title="Failed to load">
        <p>{query.error instanceof Error ? query.error.message : 'Unknown error'}</p>
      </SectionMessage>
    );
  }
  if (empty) {
    return <EmptyState size="compact" header={emptyLabel ?? 'No governed records yet'} description="Nothing has been configured in this section." />;
  }
  return <>{children}</>;
}

// ── Sections ─────────────────────────────────────────────────────────────────
function PerspectivesSection({ onError }: { onError: OnError }) {
  const q = usePerspectives();
  const list = q.data ?? [];
  const nameById = new Map(list.map((p) => [p.id, p.name]));
  return (
    <StrataPanel title="Perspectives" icon={<Layers size={16} />} count={list.length} testId="strata-admin-perspectives">
      <p style={captionStyle}>
        Perspectives are versioned, approved records.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => (
            <GovRecordCard key={p.id} name={p.name} table="strata_perspectives" record={p} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Order {p.order_index}</span>
                <span style={metaStyle}>Default weight {p.default_weight ?? '—'}</span>
                {p.parent_id ? <span style={metaStyle}>Parent {nameById.get(p.parent_id) ?? '—'}</span> : null}
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

/** Categorical segment tones — semantic token cycle, index-stable per model. */
const SEGMENT_TONES = [
  'var(--ds-text-brand)',
  'var(--ds-text-success)',
  'var(--ds-text-information)',
  'var(--ds-text-warning)',
  'var(--ds-text-danger)',
  'var(--ds-text-subtlest)',
];

function ModelWeights({ model }: { model: StrataScorecardModel }) {
  const mp = useModelPerspectives(model.id);
  const perspectives = usePerspectives();
  if (mp.isLoading) return <Spinner size="small" />;
  if (mp.isError) {
    return <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>Failed to load weights</span>;
  }
  const rows = mp.data ?? [];
  if (rows.length === 0) {
    return <span style={metaStyle}>No perspective weights configured.</span>;
  }
  const nameById = new Map((perspectives.data ?? []).map((p) => [p.id, p.name]));
  // Display of config integrity (sum shown to the admin) — not business logic.
  const sum = rows.reduce((acc, r) => acc + r.weight, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Proportional stacked weight bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: T.neutral, maxWidth: 420 }} aria-hidden>
        {rows.map((r, i) => (
          <span key={r.id} style={{ flex: r.weight, background: SEGMENT_TONES[i % SEGMENT_TONES.length] }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {rows.map((r, i) => (
          <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: SEGMENT_TONES[i % SEGMENT_TONES.length], flexShrink: 0 }} />
            {nameById.get(r.perspective_id) ?? '—'}
            <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{r.weight}%</strong>
          </span>
        ))}
        {sum === 100
          ? <StatusLozenge status="valid" label="Weights valid" appearance="success" />
          : <StatusLozenge status="invalid" label="Weights must total 100" appearance="removed" />}
      </div>
    </div>
  );
}

function ScorecardModelsSection({ onError }: { onError: OnError }) {
  const q = useScorecardModels();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Scorecard models" icon={<Scale size={16} />} count={list.length} testId="strata-admin-scorecard-models">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((m) => (
            <GovRecordCard key={m.id} name={m.name} table="strata_scorecard_models" record={m} isScorecardModel onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Scope {labelize(m.owner_scope_type)}</span>
                <span style={metaStyle}>Rollup {labelize(m.rollup_method)}</span>
                <span style={metaStyle}>Granularity {labelize(m.period_granularity)}</span>
              </div>
              <ModelWeights model={m} />
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function ThresholdsSection({ onError }: { onError: OnError }) {
  const q = useThresholdSchemes();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Threshold schemes" icon={<BarChart3 size={16} />} count={list.length} testId="strata-admin-thresholds">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((s) => (
            <GovRecordCard key={s.id} name={s.name} table="strata_threshold_schemes" record={s} onError={onError}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(s.bands ?? []).map((b) => (
                  <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <StatusLozenge status={b.key} label={b.label} appearance={(b.appearance as LozengeAppearance) ?? 'default'} />
                    <span style={metaStyle}>min {b.min_score}</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Tolerance {s.tolerance ?? '—'}</span>
                <span style={metaStyle}>Confidence threshold {s.confidence_threshold ?? '—'}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function ValueTaxonomySection({ onError }: { onError: OnError }) {
  const q = useValueCategories();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Value taxonomy" icon={<Gem size={16} />} count={list.length} testId="strata-admin-value-taxonomy">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => (
            <GovRecordCard key={c.id} name={c.name} table="strata_value_categories" record={c} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Unit {c.measurement_unit ?? '—'}</span>
                {c.validator_role ? <CatalystTag text={labelize(c.validator_role)} /> : null}
                <span style={metaStyle}>Cadence {c.realization_cadence ? labelize(c.realization_cadence) : '—'}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function GatesSection({ onError }: { onError: OnError }) {
  const q = useGateModels();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Gate models" icon={<ShieldCheck size={16} />} count={list.length} testId="strata-admin-gates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((g) => (
            <GovRecordCard key={g.id} name={g.name} table="strata_gate_models" record={g} onError={onError}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(g.stages ?? []).map((st) => (
                  <div key={st.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                      {st.order_index}. {st.name}
                    </span>
                    <span style={metaStyle}>{(st.criteria ?? []).length} criteria</span>
                    {(st.decision_options ?? []).map((d) => <CatalystTag key={d} text={labelize(d)} />)}
                    {(st.approval_roles ?? []).map((r) => <CatalystTag key={r} text={labelize(r)} color="grey" />)}
                  </div>
                ))}
                {(g.stages ?? []).length === 0 ? <span style={metaStyle}>No stages configured</span> : null}
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function KpiTypesSection({ onError }: { onError: OnError }) {
  const q = useKpiTypes();
  const list = q.data ?? [];
  return (
    <StrataPanel title="KPI types" icon={<ListChecks size={16} />} count={list.length} testId="strata-admin-kpi-types">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((k) => (
            <GovRecordCard key={k.id} name={k.name} table="strata_kpi_type_configs" record={k} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <CatalystInlineCode>{k.formula_template}</CatalystInlineCode>
                <span style={metaStyle}>{DIRECTIONALITY_LABEL[k.directionality] ?? labelize(k.directionality)}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

interface TemplateColumnRow { column: string; label: string; type: string; required?: boolean }

const TEMPLATE_COLUMNS: Column<TemplateColumnRow>[] = [
  {
    id: 'column', label: 'Column', width: 24,
    cell: ({ row }) => <span style={{ ...codeStyle, color: T.text }}>{row.column}</span>,
  },
  {
    id: 'label', label: 'Label', flex: true,
    cell: ({ row }) => <span style={bodyStyle}>{row.label}</span>,
  },
  {
    id: 'type', label: 'Type', width: 16,
    cell: ({ row }) => <CatalystTag text={labelize(row.type)} />,
  },
  {
    id: 'required', label: 'Required', width: 14,
    cell: ({ row }) => (
      <span style={row.required ? { ...bodyStyle, fontWeight: 600 } : { fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>
        {row.required ? 'Required' : 'Optional'}
      </span>
    ),
  },
];

function UploadTemplatesSection({ onError }: { onError: OnError }) {
  const q = useUploadTemplates();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Upload templates" icon={<Upload size={16} />} count={list.length} testId="strata-admin-upload-templates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((t) => (
            <GovRecordCard key={t.id} name={t.name} table="strata_upload_templates" record={t} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Target entity {labelize(t.target_entity)}</span>
                <span style={metaStyle}>{(t.validation_rules ?? []).length} validation rules</span>
              </div>
              {(t.column_schema ?? []).length > 0 ? (
                <JiraTable<TemplateColumnRow>
                  columns={TEMPLATE_COLUMNS}
                  data={t.column_schema ?? []}
                  getRowId={(c) => c.column}
                  showRowCount={false}
                  ariaLabel={`Column schema for ${t.name}`}
                />
              ) : null}
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function WorkflowsSection({ onError }: { onError: OnError }) {
  const q = useWorkflowConfigs();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Workflows" icon={<GitBranch size={16} />} count={list.length} testId="strata-admin-workflows">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((w) => (
            <GovRecordCard key={w.id} name={w.name} table="strata_workflow_configs" record={w} onError={onError}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Entity {labelize(w.entity_type)}</span>
                {(w.states ?? []).map((s) => <CatalystTag key={s.key} text={s.label} />)}
              </div>
              {(w.transitions ?? []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(w.transitions ?? []).map((t, i) => (
                    <div key={`${t.from}-${t.to}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={bodyStyle}>{labelize(t.from)}</span>
                      <span aria-hidden style={{ display: 'inline-flex', color: T.subtlest }}><MoveRight size={14} /></span>
                      <span style={bodyStyle}>{labelize(t.to)}</span>
                      {(t.roles ?? []).map((r) => <CatalystTag key={r} text={labelize(r)} color="grey" />)}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={metaStyle}>No transitions configured</span>
              )}
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

const ROLE_DOCS: Array<{ role: StrataRole; purpose: string }> = [
  { role: 'strata_admin', purpose: 'Owns the configuration engine — creates and maintains governed config records.' },
  { role: 'strategy_office', purpose: 'Curates strategy elements, scorecard models and the review cadence.' },
  { role: 'executive_viewer', purpose: 'Read-only consumption of scorecards, reviews and board packs.' },
  { role: 'kpi_owner', purpose: 'Accountable for KPI definitions, targets and submitted actuals.' },
  { role: 'vmo_validator', purpose: 'Validates benefit values and attests actuals — never their own submissions.' },
  { role: 'data_steward', purpose: 'Registers data sources, runs uploads, owns data quality and lineage.' },
];

interface RoleRow { role: StrataRole; purpose: string; assigned: boolean }

const ROLE_COLUMNS: Column<RoleRow>[] = [
  {
    id: 'role', label: 'Role', width: 24,
    cell: ({ row }) => (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ ...bodyStyle, fontWeight: 500 }}>{labelize(row.role)}</span>
        <span style={codeStyle}>{row.role}</span>
      </span>
    ),
  },
  {
    id: 'purpose', label: 'Purpose', flex: true,
    cell: ({ row }) => <span style={bodyStyle}>{row.purpose}</span>,
  },
  {
    id: 'assigned', label: 'Assigned to you', width: 16,
    cell: ({ row }) => (row.assigned
      ? <StatusLozenge status="yes" label="Yes" appearance="success" />
      : <span style={{ color: T.subtlest }}>—</span>),
  },
];

function RolesSection() {
  const roles = useStrataRoles();
  const mine = roles.data ?? [];
  const roleRows: RoleRow[] = ROLE_DOCS.map((r) => ({ ...r, assigned: mine.includes(r.role) }));
  return (
    <StrataPanel title="Roles" icon={<Users size={16} />} count={ROLE_DOCS.length} noPadding testId="strata-admin-roles">
      <div style={{ padding: '12px 16px 0' }}>
        <p style={captionStyle}>
          Segregation of duties: creators cannot approve their own records; submitters cannot validate
          their own actuals — enforced in the database.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>Your roles:</span>
          {roles.isLoading
            ? <Spinner size="small" />
            : mine.length > 0
              ? mine.map((r) => <CatalystTag key={r} text={labelize(r)} />)
              : <span style={metaStyle}>—</span>}
        </div>
      </div>
      <JiraTable<RoleRow>
        columns={ROLE_COLUMNS}
        data={roleRows}
        getRowId={(r) => r.role}
        showRowCount={false}
        ariaLabel="STRATA roles"
      />
    </StrataPanel>
  );
}

const CR_STATUS: Record<StrataChangeRequest['status'], LozengeAppearance> = {
  approved: 'success', rejected: 'removed', pending: 'moved', withdrawn: 'default',
};

interface AuditEventRow {
  id: string;
  entity_table: string | null;
  action: string | null;
  created_at: string;
}

const CR_COLUMNS: Column<StrataChangeRequest>[] = [
  {
    id: 'entity', label: 'Entity', width: 22,
    cell: ({ row }) => <span style={{ ...codeStyle, color: T.text }}>{row.entity_table}</span>,
  },
  {
    id: 'change', label: 'Change', width: 14,
    cell: ({ row }) => <CatalystTag text={labelize(row.change_type)} />,
  },
  {
    id: 'requested', label: 'Requested', width: 15,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.requested_at)}</span>,
  },
  {
    id: 'status', label: 'Status', width: 13,
    cell: ({ row }) => <StatusLozenge status={row.status} label={labelize(row.status)} appearance={CR_STATUS[row.status] ?? 'default'} />,
  },
  {
    id: 'decided', label: 'Decided', flex: true,
    cell: ({ row }) => (row.decided_at
      ? <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.decided_at)}</span>
      : <span style={{ color: T.subtlest }}>—</span>),
  },
];

const AUDIT_COLUMNS: Column<AuditEventRow>[] = [
  {
    id: 'entity', label: 'Entity', width: 26,
    cell: ({ row }) => (row.entity_table
      ? <span style={{ ...codeStyle, color: T.text }}>{row.entity_table}</span>
      : <span style={{ color: T.subtlest }}>—</span>),
  },
  {
    id: 'action', label: 'Action', flex: true,
    cell: ({ row }) => (row.action
      ? <span style={bodyStyle}>{labelize(row.action)}</span>
      : <span style={{ color: T.subtlest }}>—</span>),
  },
  {
    id: 'at', label: 'At', width: 20,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(row.created_at)}</span>,
  },
];

function ChangeLogSection() {
  const crs = useChangeRequests();
  const audit = useStrataAudit();
  const crList = crs.data ?? [];
  const auditList = ((audit.data ?? []) as AuditEventRow[]).slice(0, 20);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel title="Change requests" icon={<GitBranch size={16} />} count={crList.length} noPadding testId="strata-admin-change-requests">
        <SectionState query={crs} empty={crList.length === 0} emptyLabel="No change requests">
          <JiraTable<StrataChangeRequest>
            columns={CR_COLUMNS}
            data={crList}
            getRowId={(cr) => cr.id}
            ariaLabel="Change requests"
          />
        </SectionState>
      </StrataPanel>
      <StrataPanel title="Audit trail" icon={<Clock size={16} />} count={auditList.length} noPadding testId="strata-admin-audit">
        <SectionState query={audit} empty={auditList.length === 0} emptyLabel="No audit events">
          <JiraTable<AuditEventRow>
            columns={AUDIT_COLUMNS}
            data={auditList}
            getRowId={(ev) => ev.id}
            showRowCount={false}
            ariaLabel="Audit trail — last 20 events"
          />
        </SectionState>
      </StrataPanel>
    </div>
  );
}

// ── Section registry + page ──────────────────────────────────────────────────
const SECTIONS: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  render: (onError: OnError) => React.ReactNode;
}> = [
  { key: 'perspectives', label: 'Perspectives', icon: Layers, render: (e) => <PerspectivesSection onError={e} /> },
  { key: 'scorecard-models', label: 'Scorecard models', icon: Scale, render: (e) => <ScorecardModelsSection onError={e} /> },
  { key: 'thresholds', label: 'Thresholds', icon: BarChart3, render: (e) => <ThresholdsSection onError={e} /> },
  { key: 'value-taxonomy', label: 'Value taxonomy', icon: Gem, render: (e) => <ValueTaxonomySection onError={e} /> },
  { key: 'gates', label: 'Gates', icon: ShieldCheck, render: (e) => <GatesSection onError={e} /> },
  { key: 'kpi-types', label: 'KPI types', icon: ListChecks, render: (e) => <KpiTypesSection onError={e} /> },
  { key: 'upload-templates', label: 'Upload templates', icon: Upload, render: (e) => <UploadTemplatesSection onError={e} /> },
  { key: 'workflows', label: 'Workflows', icon: GitBranch, render: (e) => <WorkflowsSection onError={e} /> },
  { key: 'roles', label: 'Roles', icon: Users, render: () => <RolesSection /> },
  { key: 'change-log', label: 'Change log', icon: Clock, render: () => <ChangeLogSection /> },
];

export default function StrataAdminConfigPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  const idx = SECTIONS.findIndex((s) => s.key === section);
  const selected = idx >= 0 ? idx : 0;

  return (
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<Settings2 size={20} />}
        title="Configuration Engine"
        description="Versioned, approved and audited configuration."
      />
      <Tabs
        id="strata-admin-tabs"
        selected={selected}
        onChange={(i) => { setActionError(null); navigate(Routes.strata.adminSection(SECTIONS[i].key)); }}
      >
        <TabList>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Tab key={s.key}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={14} />
                  {s.label}
                </span>
              </Tab>
            );
          })}
        </TabList>
        {SECTIONS.map((s) => (
          <TabPanel key={s.key}>
            <div style={{ width: '100%', paddingTop: 16 }}>
              {actionError ? (
                <div style={{ marginBottom: 16 }}>
                  <SectionMessage appearance="error" title="Governance action rejected by the database">
                    <p>{actionError}</p>
                  </SectionMessage>
                </div>
              ) : null}
              {s.render(setActionError)}
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </PageContainer>
  );
}
