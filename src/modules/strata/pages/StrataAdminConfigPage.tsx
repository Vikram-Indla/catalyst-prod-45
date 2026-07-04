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
import Badge from '@atlaskit/badge';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { configApi } from '@/modules/strata/domain';
import {
  useChangeRequests, useGateModels, useInvalidateStrata, useKpiTypes, useModelPerspectives,
  usePerspectives, useScorecardModels, useStrataAudit, useStrataRoles, useThresholdSchemes,
  useUploadTemplates, useValueCategories, useWorkflowConfigs,
} from '@/modules/strata/hooks/useStrata';
import { StrataConfigContextBar, StrataPanel } from '@/modules/strata/components/shared';
import type {
  GovernedEnvelope, GovernedStatus, StrataChangeRequest, StrataRole, StrataScorecardModel,
} from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];
type OnError = (msg: string | null) => void;

// ── Shared bits ──────────────────────────────────────────────────────────────
const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text)',
  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
};

const codeChipStyle: React.CSSProperties = {
  ...chipStyle, fontFamily: 'var(--ds-font-family-code, monospace)', fontWeight: 500,
};

const captionStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' };
const metaStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ds-text-subtle)' };

const GOV_LOZENGE: Record<GovernedStatus, LozengeAppearance> = {
  approved: 'success', draft: 'default', pending_approval: 'moved', retired: 'removed', superseded: 'removed',
};

function GovStatusLozenge({ status }: { status: GovernedStatus }) {
  return <Lozenge appearance={GOV_LOZENGE[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Lozenge>;
}

function fmtDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

/** The governance envelope — shown prominently on every governed record. */
function GovEnvelope({ r }: { r: GovernedEnvelope }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Badge>{`v${r.version}`}</Badge>
      <GovStatusLozenge status={r.status} />
      <span style={metaStyle}>Effective {fmtDate(r.effective_from)}</span>
      <span style={metaStyle}>{r.approved_at ? `Approved ${fmtDate(r.approved_at)}` : '—'}</span>
      {r.change_reason ? (
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>{r.change_reason}</span>
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
        appearance="primary"
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
      <Button
        spacing="compact"
        isDisabled={busy}
        onClick={() => {
          const reason = window.prompt('Retirement reason');
          if (reason == null) return;
          void act(() => configApi.retireRecord(table, record.id, reason || undefined));
        }}
      >
        Retire
      </Button>
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
        border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12,
        background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13, color: 'var(--ds-text)' }}>{name}</strong>
        <GovActions table={table} record={record} isScorecardModel={isScorecardModel} onError={onError} />
      </div>
      <GovEnvelope r={record} />
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, fontWeight: 700,
      color: 'var(--ds-text-subtle)',
      borderBottom: '2px solid var(--ds-border)', whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--ds-text)',
      borderBottom: '1px solid var(--ds-border)', verticalAlign: 'top', ...style,
    }}>{children}</td>
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
    <StrataPanel title="Perspectives" testId="strata-admin-perspectives">
      <p style={captionStyle}>
        Perspectives are governed records — never constants. Weights live on scorecard models.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => (
            <GovRecordCard key={p.id} name={p.name} table="strata_perspectives" record={p} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Order {p.order_index}</span>
                <span style={metaStyle}>Default weight {p.default_weight ?? '—'}</span>
                <span style={metaStyle}>Parent {p.parent_id ? nameById.get(p.parent_id) ?? '—' : '—'}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function ModelWeights({ model }: { model: StrataScorecardModel }) {
  const mp = useModelPerspectives(model.id);
  const perspectives = usePerspectives();
  if (mp.isLoading) return <Spinner size="small" />;
  if (mp.isError) {
    return <span style={{ fontSize: 12, color: 'var(--ds-text-danger)' }}>Failed to load weights</span>;
  }
  const rows = mp.data ?? [];
  if (rows.length === 0) {
    return <span style={metaStyle}>No perspective weights configured — —</span>;
  }
  const nameById = new Map((perspectives.data ?? []).map((p) => [p.id, p.name]));
  // Display of config integrity (sum shown to the admin) — not business logic.
  const sum = rows.reduce((acc, r) => acc + r.weight, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {rows.map((r) => (
          <span key={r.id} style={chipStyle}>
            {nameById.get(r.perspective_id) ?? '—'} · {r.weight}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={metaStyle}>Σ = {sum}</span>
        {sum === 100
          ? <Lozenge appearance="success">Weights valid</Lozenge>
          : <Lozenge appearance="removed">Weights ≠ 100</Lozenge>}
      </div>
    </div>
  );
}

function ScorecardModelsSection({ onError }: { onError: OnError }) {
  const q = useScorecardModels();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Scorecard models" testId="strata-admin-scorecard-models">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((m) => (
            <GovRecordCard key={m.id} name={m.name} table="strata_scorecard_models" record={m} isScorecardModel onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Scope {m.owner_scope_type}</span>
                <span style={metaStyle}>Rollup {m.rollup_method}</span>
                <span style={metaStyle}>Granularity {m.period_granularity}</span>
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
    <StrataPanel title="Threshold schemes" testId="strata-admin-thresholds">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((s) => (
            <GovRecordCard key={s.id} name={s.name} table="strata_threshold_schemes" record={s} onError={onError}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(s.bands ?? []).map((b) => (
                  <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Lozenge appearance={(b.appearance as LozengeAppearance) ?? 'default'}>{b.label}</Lozenge>
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
    <StrataPanel title="Value taxonomy" testId="strata-admin-value-taxonomy">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => (
            <GovRecordCard key={c.id} name={c.name} table="strata_value_categories" record={c} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Unit {c.measurement_unit ?? '—'}</span>
                {c.validator_role ? <span style={chipStyle}>{c.validator_role}</span> : <span style={metaStyle}>Validator —</span>}
                <span style={metaStyle}>Cadence {c.realization_cadence ?? '—'}</span>
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
    <StrataPanel title="Gate models" testId="strata-admin-gates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((g) => (
            <GovRecordCard key={g.id} name={g.name} table="strata_gate_models" record={g} onError={onError}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(g.stages ?? []).map((st) => (
                  <div key={st.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)' }}>
                      {st.order_index}. {st.name}
                    </span>
                    <span style={metaStyle}>{(st.criteria ?? []).length} criteria</span>
                    {(st.decision_options ?? []).map((d) => <span key={d} style={chipStyle}>{d}</span>)}
                    {(st.approval_roles ?? []).map((r) => <span key={r} style={codeChipStyle}>{r}</span>)}
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
    <StrataPanel title="KPI types" testId="strata-admin-kpi-types">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((k) => (
            <GovRecordCard key={k.id} name={k.name} table="strata_kpi_type_configs" record={k} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={codeChipStyle}>{k.formula_template}</span>
                <span style={metaStyle}>Direction {k.directionality.replace(/_/g, ' ')}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function UploadTemplatesSection({ onError }: { onError: OnError }) {
  const q = useUploadTemplates();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Upload templates" testId="strata-admin-upload-templates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((t) => (
            <GovRecordCard key={t.id} name={t.name} table="strata_upload_templates" record={t} onError={onError}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Target entity {t.target_entity}</span>
                <span style={metaStyle}>{(t.validation_rules ?? []).length} validation rules</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><Th>Column</Th><Th>Label</Th><Th>Type</Th><Th>Required</Th></tr>
                  </thead>
                  <tbody>
                    {(t.column_schema ?? []).map((c) => (
                      <tr key={c.column}>
                        <Td style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12 }}>{c.column}</Td>
                        <Td>{c.label}</Td>
                        <Td>{c.type}</Td>
                        <Td>{c.required ? 'Required' : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
    <StrataPanel title="Workflows" testId="strata-admin-workflows">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((w) => (
            <GovRecordCard key={w.id} name={w.name} table="strata_workflow_configs" record={w} onError={onError}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Entity {w.entity_type}</span>
                {(w.states ?? []).map((s) => <span key={s.key} style={chipStyle}>{s.label}</span>)}
                <span style={metaStyle}>{(w.transitions ?? []).length} transitions</span>
              </div>
              <p style={{ ...captionStyle, margin: 0 }}>
                {(w.transitions ?? [])
                  .map((t) => `${t.from} → ${t.to}${t.roles?.length ? ` (${t.roles.join(', ')})` : ''}`)
                  .join(' · ') || '—'}
              </p>
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

function RolesSection() {
  const roles = useStrataRoles();
  const mine = roles.data ?? [];
  return (
    <StrataPanel title="Roles" testId="strata-admin-roles">
      <p style={captionStyle}>
        Segregation of duties: creators cannot approve their own records; submitters cannot validate
        their own actuals — enforced in the database.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>Your roles:</span>
        {roles.isLoading
          ? <Spinner size="small" />
          : mine.length > 0
            ? mine.map((r) => <span key={r} style={codeChipStyle}>{r}</span>)
            : <span style={metaStyle}>—</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><Th>Role</Th><Th>Purpose</Th><Th>Assigned to you</Th></tr>
          </thead>
          <tbody>
            {ROLE_DOCS.map((r) => (
              <tr key={r.role}>
                <Td style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12 }}>{r.role}</Td>
                <Td>{r.purpose}</Td>
                <Td>{mine.includes(r.role) ? <Lozenge appearance="success">Yes</Lozenge> : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StrataPanel>
  );
}

function crStatusLozenge(status: StrataChangeRequest['status']) {
  const map: Record<StrataChangeRequest['status'], LozengeAppearance> = {
    approved: 'success', rejected: 'removed', pending: 'moved', withdrawn: 'default',
  };
  return <Lozenge appearance={map[status] ?? 'default'}>{status}</Lozenge>;
}

interface AuditEventRow {
  id: string;
  entity_table: string | null;
  action: string | null;
  created_at: string;
}

function ChangeLogSection() {
  const crs = useChangeRequests();
  const audit = useStrataAudit();
  const crList = crs.data ?? [];
  const auditList = ((audit.data ?? []) as AuditEventRow[]).slice(0, 20);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel title="Change requests" testId="strata-admin-change-requests">
        <SectionState query={crs} empty={crList.length === 0} emptyLabel="No change requests">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><Th>Entity</Th><Th>Change</Th><Th>Requested</Th><Th>Status</Th><Th>Decided</Th></tr>
              </thead>
              <tbody>
                {crList.map((cr) => (
                  <tr key={cr.id}>
                    <Td style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12 }}>{cr.entity_table}</Td>
                    <Td>{cr.change_type}</Td>
                    <Td>{fmtDate(cr.requested_at)}</Td>
                    <Td>{crStatusLozenge(cr.status)}</Td>
                    <Td>{cr.decided_by ? `Decided ${fmtDate(cr.decided_at)}` : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionState>
      </StrataPanel>
      <StrataPanel title="Audit trail (last 20 events)" testId="strata-admin-audit">
        <SectionState query={audit} empty={auditList.length === 0} emptyLabel="No audit events">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><Th>Entity</Th><Th>Action</Th><Th>At</Th></tr>
              </thead>
              <tbody>
                {auditList.map((ev) => (
                  <tr key={ev.id}>
                    <Td style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12 }}>{ev.entity_table ?? '—'}</Td>
                    <Td>{ev.action ?? '—'}</Td>
                    <Td>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionState>
      </StrataPanel>
    </div>
  );
}

// ── Section registry + page ──────────────────────────────────────────────────
const SECTIONS: Array<{ key: string; label: string; render: (onError: OnError) => React.ReactNode }> = [
  { key: 'perspectives', label: 'Perspectives', render: (e) => <PerspectivesSection onError={e} /> },
  { key: 'scorecard-models', label: 'Scorecard models', render: (e) => <ScorecardModelsSection onError={e} /> },
  { key: 'thresholds', label: 'Thresholds', render: (e) => <ThresholdsSection onError={e} /> },
  { key: 'value-taxonomy', label: 'Value taxonomy', render: (e) => <ValueTaxonomySection onError={e} /> },
  { key: 'gates', label: 'Gates', render: (e) => <GatesSection onError={e} /> },
  { key: 'kpi-types', label: 'KPI types', render: (e) => <KpiTypesSection onError={e} /> },
  { key: 'upload-templates', label: 'Upload templates', render: (e) => <UploadTemplatesSection onError={e} /> },
  { key: 'workflows', label: 'Workflows', render: (e) => <WorkflowsSection onError={e} /> },
  { key: 'roles', label: 'Roles', render: () => <RolesSection /> },
  { key: 'change-log', label: 'Change log', render: () => <ChangeLogSection /> },
];

export default function StrataAdminConfigPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  const idx = SECTIONS.findIndex((s) => s.key === section);
  const selected = idx >= 0 ? idx : 0;

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 4px' }}>
        Configuration Engine
      </h1>
      <p style={{ ...captionStyle, margin: '0 0 8px' }}>
        Configuration Engine — versioned metadata + governance control. Every change is versioned,
        approved and audited.
      </p>
      <StrataConfigContextBar />
      {actionError ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Governance action rejected by the database">
            <p>{actionError}</p>
          </SectionMessage>
        </div>
      ) : null}
      <Tabs
        id="strata-admin-tabs"
        selected={selected}
        onChange={(i) => navigate(Routes.strata.adminSection(SECTIONS[i].key))}
      >
        <TabList>
          {SECTIONS.map((s) => <Tab key={s.key}>{s.label}</Tab>)}
        </TabList>
        {SECTIONS.map((s) => (
          <TabPanel key={s.key}>
            <div style={{ width: '100%', paddingTop: 16 }}>{s.render(setActionError)}</div>
          </TabPanel>
        ))}
      </Tabs>
    </PageContainer>
  );
}
