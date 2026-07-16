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
  Button, CatalystInlineCode, CatalystTag, EmptyState, Lozenge, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, SectionMessage, Spinner, Textfield,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  BarChart3, Bell, CheckCircle2, Clock, Gem, GitBranch, Layers, ListChecks,
  MoveRight, Rocket, Scale, ShieldCheck, Upload, Users,
} from '@/lib/atlaskit-icons';
import Toggle from '@atlaskit/toggle';
import { configApi, governanceApi } from '@/modules/strata/domain';
import {
  useAllModelPerspectives, useChangeRequests, useGateModels, useInvalidateStrata, useKpiTypes, useModelPerspectives,
  usePerspectives, useProfileNames, useProjectCardFieldConfigs, useProjectCardPicklists,
  useProjectCardSectionConfigs, useProjectCardTabConfigs, useRoleAssignments, useScorecardModels,
  useStrataAudit, useStrataNotificationRules, useStrataRoles, useThresholdSchemes, useUploadTemplates, useValueCategories,
  useWorkflowConfigs,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { StrataFormModal, str } from '@/modules/strata/components/authoring';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  GovernedEnvelope, GovernedStatus, StrataChangeRequest, StrataNotificationRule, StrataPerspective,
  StrataProjectCardFieldConfig, StrataProjectCardPicklist, StrataRole, StrataScorecardModel, ThresholdBand,
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

export function GovStatusLozenge({ status }: { status: GovernedStatus }) {
  return <StatusLozenge status={status} label={labelize(status)} appearance={GOV_LOZENGE[status] ?? 'default'} />;
}

/** The governance envelope — shown prominently on every governed record. */
export function GovEnvelope({ r }: { r: GovernedEnvelope }) {
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
export function GovActions({ table, record, isScorecardModel, onError, submitBlockedReason }: {
  table: string;
  record: { id: string; status: GovernedStatus };
  isScorecardModel?: boolean;
  onError: OnError;
  /** When set, the draft "Submit for approval" action is disabled and the
   * reason is shown inline (never a silent disable — anchor 05 states rule). */
  submitBlockedReason?: string | null;
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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Button
          spacing="compact"
          isDisabled={busy || !!submitBlockedReason}
          onClick={() => void act(() => configApi.submitRecord(table, record.id))}
        >
          Submit for approval
        </Button>
        {submitBlockedReason ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>{submitBlockedReason}</span>
        ) : null}
      </span>
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
function GovRecordCard({ name, table, record, isScorecardModel, onError, headerActions, submitBlockedReason, children }: {
  name: string;
  table: string;
  record: GovernedEnvelope & { id: string };
  isScorecardModel?: boolean;
  onError: OnError;
  /** Extra header controls (e.g. Edit) shown alongside the lifecycle actions. */
  headerActions?: React.ReactNode;
  /** Forwarded to GovActions — blocks Submit with a visible reason. */
  submitBlockedReason?: string | null;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {headerActions}
          <GovActions table={table} record={record} isScorecardModel={isScorecardModel} onError={onError} submitBlockedReason={submitBlockedReason} />
        </div>
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
/** Create/edit fields for a perspective. color_token is intentionally omitted:
 * it is nullable/unused and the DB requires an ADS token NAME string — with no
 * curated token list to source from, we render nothing rather than invent one. */
function perspectiveFields(list: StrataPerspective[], excludeId?: string): React.ComponentProps<typeof StrataFormModal>['fields'] {
  return [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'orderIndex', label: 'Order index', kind: 'number', min: 0 },
    { key: 'defaultWeight', label: 'Default weight', kind: 'number', min: 0 },
    {
      key: 'parentId', label: 'Parent perspective', kind: 'select',
      options: list.filter((p) => p.id !== excludeId).map((p) => ({ value: p.id, label: p.name })),
    },
  ];
}

const numOrUndef = (v: string | number | boolean | null): number | undefined =>
  v == null || v === '' ? undefined : Number(v);

function PerspectivesSection({ onError }: { onError: OnError }) {
  const q = usePerspectives();
  const roles = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const list = q.data ?? [];
  const nameById = new Map(list.map((p) => [p.id, p.name]));
  // Same gate the DB enforces for INSERT/UPDATE on strata_perspectives.
  const canConfigure = (roles.data ?? []).some((r) => r === 'strata_admin' || r === 'strategy_office');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StrataPerspective | null>(null);

  return (
    <StrataPanel
      title="Perspectives"
      icon={<Layers size={16} />}
      count={list.length}
      testId="strata-admin-perspectives"
      actions={canConfigure ? (
        <Button spacing="compact" onClick={() => setCreateOpen(true)} testId="strata-perspective-new">
          New perspective
        </Button>
      ) : undefined}
    >
      <p style={captionStyle}>
        Perspectives are versioned, approved records. New perspectives start as a draft; only drafts can be
        edited — submit a draft for approval from its lifecycle actions.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => (
            <GovRecordCard
              key={p.id}
              name={p.name}
              table="strata_perspectives"
              record={p}
              onError={onError}
              headerActions={canConfigure && p.status === 'draft' ? (
                <Button
                  spacing="compact"
                  appearance="subtle"
                  onClick={() => setEditTarget(p)}
                  testId={`strata-perspective-edit-${p.id}`}
                >
                  Edit
                </Button>
              ) : undefined}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Order {p.order_index}</span>
                <span style={metaStyle}>Default weight {p.default_weight ?? '—'}</span>
                {p.parent_id ? <span style={metaStyle}>Parent {nameById.get(p.parent_id) ?? '—'}</span> : null}
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>

      <StrataFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New perspective"
        description="Created as a draft. Submit it for approval from the record's lifecycle actions once ready."
        fields={perspectiveFields(list)}
        submitLabel="Create perspective"
        testId="strata-perspective-create-modal"
        onSubmit={async (v) => {
          await configApi.createPerspective({
            name: String(v.name ?? '').trim(),
            description: str(v.description),
            orderIndex: numOrUndef(v.orderIndex),
            defaultWeight: numOrUndef(v.defaultWeight),
            parentId: str(v.parentId),
          });
          invalidate();
        }}
      />

      {editTarget ? (
        <StrataFormModal
          open
          onClose={() => setEditTarget(null)}
          title="Edit perspective"
          description="Only draft perspectives can be edited. Approved records use the lifecycle actions."
          fields={perspectiveFields(list, editTarget.id)}
          initial={{
            name: editTarget.name,
            description: editTarget.description,
            orderIndex: editTarget.order_index,
            defaultWeight: editTarget.default_weight,
            parentId: editTarget.parent_id,
          }}
          submitLabel="Save"
          testId="strata-perspective-edit-modal"
          onSubmit={async (v) => {
            await configApi.updatePerspective(editTarget.id, {
              name: String(v.name ?? '').trim(),
              description: str(v.description),
              orderIndex: numOrUndef(v.orderIndex),
              defaultWeight: numOrUndef(v.defaultWeight),
              parentId: str(v.parentId),
            });
            invalidate();
          }}
        />
      ) : null}
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

function ModelWeights({ model, canEditWeights }: { model: StrataScorecardModel; canEditWeights: boolean }) {
  const mp = useModelPerspectives(model.id);
  const perspectives = usePerspectives();
  const invalidate = useInvalidateStrata();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const startEdit = () => {
    setDraft(Object.fromEntries(rows.map((r) => [r.perspective_id, String(r.weight)])));
    setError(null);
    setEditing(true);
  };
  // Cancel restores the displayed (persisted) values by dropping the draft.
  const cancel = () => { setEditing(false); setError(null); };
  const draftTotal = rows.reduce((acc, r) => acc + (Number(draft[r.perspective_id]) || 0), 0);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await configApi.setModelPerspectiveWeights(model.id, rows.map((r) => ({
        perspectiveId: r.perspective_id,
        weight: Number(draft[r.perspective_id]) || 0,
      })));
      invalidate();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...metaStyle, minWidth: 160 }}>{nameById.get(r.perspective_id) ?? '—'}</span>
            <div style={{ width: 120 }}>
              <Textfield
                type="number"
                spacing="compact"
                value={draft[r.perspective_id] ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, [r.perspective_id]: val }));
                }}
                aria-label={`Weight for ${nameById.get(r.perspective_id) ?? 'perspective'}`}
                elemAfterInput={<span style={{ paddingRight: 'var(--ds-space-050)', color: T.subtlest }}>%</span>}
                testId={`strata-model-weight-input-${r.perspective_id}`}
              />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={metaStyle}>
            Total <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{draftTotal}%</strong>
          </span>
          {draftTotal === 100
            ? <StatusLozenge status="valid" label="Weights valid" appearance="success" />
            : <StatusLozenge status="invalid" label="Weights must total 100" appearance="removed" />}
          <Button
            spacing="compact"
            appearance="primary"
            isDisabled={saving || draftTotal !== 100}
            onClick={() => void save()}
            testId={`strata-model-weights-save-${model.id}`}
          >
            {saving ? 'Saving…' : 'Save weights'}
          </Button>
          <Button spacing="compact" appearance="subtle" isDisabled={saving} onClick={cancel}>Cancel</Button>
        </div>
        {error ? (
          <SectionMessage appearance="error" title="Action rejected">
            <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
          </SectionMessage>
        ) : null}
      </div>
    );
  }

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
        {canEditWeights ? (
          <Button
            spacing="compact"
            appearance="subtle"
            onClick={startEdit}
            testId={`strata-model-weights-edit-${model.id}`}
          >
            Edit weights
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Tri-state model integrity band (anchor 05) — perspective weights must total
 * 100 before a draft model can be submitted. Glyph + word carry state (never
 * color alone). Measure-level checks are a later feature (no measures table). */
function ModelIntegrityBand({ sum, count }: { sum: number; count: number }) {
  const ok = count > 0 && sum === 100;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 6,
        background: T.sunken, fontSize: 'var(--ds-font-size-100)',
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest }}>MODEL INTEGRITY</span>
      {count === 0 ? (
        <span style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>△ No perspective weights configured yet</span>
      ) : ok ? (
        <span style={{ color: 'var(--ds-text-success)', fontWeight: 600 }}>✓ Perspective weights total 100</span>
      ) : (
        <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>
          ✕ Perspective weights total {sum} — {sum < 100 ? `assign the remaining ${100 - sum}` : `remove ${sum - 100}`}
        </span>
      )}
      {!ok ? <span style={{ marginLeft: 'auto', color: T.subtlest }}>Cannot submit until integrity passes</span> : null}
    </div>
  );
}

export function ScorecardModelsSection({ onError }: { onError: OnError }) {
  const q = useScorecardModels();
  const allMP = useAllModelPerspectives();
  const roles = useStrataRoles();
  const list = q.data ?? [];
  // strata_scorecard_model_perspectives write is strategy_office (matches RLS).
  const canEditWeights = (roles.data ?? []).includes('strategy_office');

  // Per-model perspective-weight sum + count (config integrity), client-derived.
  const weightByModel = new Map<string, number>();
  const countByModel = new Map<string, number>();
  for (const mp of allMP.data ?? []) {
    weightByModel.set(mp.model_id, (weightByModel.get(mp.model_id) ?? 0) + mp.weight);
    countByModel.set(mp.model_id, (countByModel.get(mp.model_id) ?? 0) + 1);
  }

  return (
    <StrataPanel title="Scorecard models" icon={<Scale size={16} />} count={list.length} testId="strata-admin-scorecard-models">
      <p style={captionStyle}>
        The builder governs perspective weights, integrity and lifecycle — a model's perspective weights must total 100
        before it can be submitted for approval. Measure-level authoring, preview-with-data and version diff are later features.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((m) => {
            const wsum = weightByModel.get(m.id) ?? 0;
            const wcount = countByModel.get(m.id) ?? 0;
            const integrityOk = wcount > 0 && wsum === 100;
            const submitBlockedReason = m.status === 'draft' && !integrityOk
              ? (wcount === 0 ? 'Add perspective weights totalling 100 first' : `Weights total ${wsum} — must total 100`)
              : undefined;
            return (
              <GovRecordCard
                key={m.id}
                name={m.name}
                table="strata_scorecard_models"
                record={m}
                isScorecardModel
                onError={onError}
                submitBlockedReason={submitBlockedReason}
              >
                <ModelIntegrityBand sum={wsum} count={wcount} />
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={metaStyle}>Scope {labelize(m.owner_scope_type)}</span>
                  <span style={metaStyle}>Rollup {labelize(m.rollup_method)}</span>
                  <span style={metaStyle}>Granularity {labelize(m.period_granularity)}</span>
                </div>
                <ModelWeights model={m} canEditWeights={canEditWeights} />
              </GovRecordCard>
            );
          })}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

/** A band's readable range: From ≥ its own min_score, To < the next-higher
 * band's min_score (open top). Anchor 25 — the boundary is the design object. */
interface BandRow { key: string; label: string; appearance?: string; from: number; to: number | null }

const THRESHOLD_BAND_COLUMNS: Column<BandRow>[] = [
  {
    id: 'band', label: 'Band', flex: true,
    cell: ({ row }) => <StatusLozenge status={row.key} label={row.label} appearance={(row.appearance as LozengeAppearance) ?? 'default'} />,
  },
  {
    id: 'from', label: 'From ≥', width: 18,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.from}</span>,
  },
  {
    id: 'to', label: 'To <', width: 18,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.to ?? '—'}</span>,
  },
];

function bandRows(bands: ThresholdBand[]): BandRow[] {
  const sorted = [...bands].sort((a, b) => b.min_score - a.min_score);
  return sorted.map((b, i) => ({
    key: b.key, label: b.label, appearance: b.appearance,
    from: b.min_score, to: i === 0 ? null : sorted[i - 1].min_score,
  }));
}

export function ThresholdsSection({ onError }: { onError: OnError }) {
  const q = useThresholdSchemes();
  const list = q.data ?? [];
  const pending = list.filter((s) => s.status === 'pending_approval');
  // Sibling-version count per name → surfaces "compare versions" affordance honestly.
  const versionsByName = new Map<string, number>();
  for (const s of list) versionsByName.set(s.name, (versionsByName.get(s.name) ?? 0) + 1);

  return (
    <StrataPanel title="Threshold schemes" icon={<BarChart3 size={16} />} count={list.length} testId="strata-admin-thresholds">
      <p style={captionStyle}>
        A threshold scheme turns an achievement score into a rating — the bands below are governed policy, effective-dated so
        past periods keep their scheme version. Editing bands and the server-calculated impact preview are later features;
        today you can review the boundaries, compare versions and manage lifecycle.
      </p>
      {pending.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="warning" title={`${pending.length} scheme change${pending.length === 1 ? '' : 's'} pending approval`}>
            <p>
              {pending.map((p) => `${p.name} v${p.version}`).join(', ')} — a different strata_admin than the author must
              approve. Self-approval is blocked in the database.
            </p>
          </SectionMessage>
        </div>
      ) : null}
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((s) => (
            <GovRecordCard key={s.id} name={s.name} table="strata_threshold_schemes" record={s} onError={onError}>
              {s.description ? <span style={metaStyle}>{s.description}</span> : null}
              {(versionsByName.get(s.name) ?? 0) > 1 ? (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                  Multiple versions of “{s.name}” exist — compare the bands across the cards to see what a version changes.
                </span>
              ) : null}
              {(s.bands ?? []).length > 0 ? (
                <JiraTable<BandRow>
                  columns={THRESHOLD_BAND_COLUMNS}
                  data={bandRows(s.bands)}
                  getRowId={(b) => b.key}
                  showRowCount={false}
                  ariaLabel={`Bands for ${s.name} v${s.version}`}
                />
              ) : <span style={metaStyle}>No bands configured.</span>}
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

export function KpiTypesSection({ onError }: { onError: OnError }) {
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

export function UploadTemplatesSection({ onError }: { onError: OnError }) {
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

export function WorkflowsSection({ onError }: { onError: OnError }) {
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

export const ROLE_DOCS: Array<{ role: StrataRole; purpose: string }> = [
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
        <span style={{ ...bodyStyle, fontWeight: 500, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>{labelize(row.role)}</span>
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

/** strata_role_assignments row (domain returns untyped rows). */
interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role: StrataRole;
  scope_type: string;
  scope_entity_id: string | null;
  granted_by: string | null;
  granted_at: string;
}

const ASSIGNABLE_ROLES: Array<{ value: string; label: string }> =
  ROLE_DOCS.map((r) => ({ value: r.role, label: labelize(r.role) }));

function RolesSection({ onError }: { onError: OnError }) {
  const roles = useStrataRoles();
  const mine = roles.data ?? [];
  const assignmentsQ = useRoleAssignments();
  const profilesQ = useProfileNames();
  const invalidate = useInvalidateStrata();
  const [assignOpen, setAssignOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // UI affordance gating only — the RPCs also authorise platform admins
  // server-side, even without a strata_admin assignment row.
  const isStrataAdmin = mine.includes('strata_admin');
  const assignments = (assignmentsQ.data ?? []) as RoleAssignmentRow[];
  const profileName = (id: string | null): string | null =>
    id ? profilesQ.data?.get(id)?.name ?? null : null;

  const revoke = async (assignmentId: string) => {
    setBusyId(assignmentId);
    onError(null);
    try {
      await governanceApi.revokeRole(assignmentId);
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const assignmentColumns: Column<RoleAssignmentRow>[] = [
    {
      id: 'user', label: 'User', flex: true,
      cell: ({ row }) => {
        const name = profileName(row.user_id);
        return name ? <span style={bodyStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'role', label: 'Role', width: 18,
      cell: ({ row }) => <StatusLozenge status={row.role} label={labelize(row.role)} appearance="default" />,
    },
    {
      id: 'scope', label: 'Scope', width: 12,
      cell: ({ row }) => <span style={metaStyle}>{labelize(row.scope_type)}</span>,
    },
    {
      id: 'granted', label: 'Granted', width: 13,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.granted_at)}</span>,
    },
    {
      id: 'granted-by', label: 'Granted by', width: 15,
      cell: ({ row }) => {
        const name = profileName(row.granted_by);
        return name ? <span style={metaStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    ...(isStrataAdmin ? [{
      id: 'revoke', label: '', width: 10, align: 'end' as const,
      cell: ({ row }: { row: RoleAssignmentRow }) => (
        <Button
          spacing="compact"
          appearance="subtle"
          isDisabled={busyId === row.id}
          onClick={() => void revoke(row.id)}
          testId={`strata-admin-revoke-${row.id}`}
        >
          Revoke
        </Button>
      ),
    }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel
        title="Role assignments"
        icon={<Users size={16} />}
        count={assignments.length}
        noPadding
        testId="strata-admin-role-assignments"
        actions={isStrataAdmin ? (
          <Button
            appearance="primary"
            spacing="compact"
            onClick={() => setAssignOpen(true)}
            testId="strata-admin-assign-role"
          >
            Assign role
          </Button>
        ) : undefined}
      >
        <SectionState query={assignmentsQ} empty={assignments.length === 0} emptyLabel="No role assignments">
          <JiraTable<RoleAssignmentRow>
            columns={assignmentColumns}
            data={assignments}
            getRowId={(r) => r.id}
            showRowCount={false}
            ariaLabel="STRATA role assignments"
          />
        </SectionState>
      </StrataPanel>

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
          data={roleRows(mine)}
          getRowId={(r) => r.role}
          showRowCount={false}
          ariaLabel="STRATA roles"
        />
      </StrataPanel>

      {isStrataAdmin ? (
        <StrataFormModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="Assign role"
          description="Grants a STRATA persona role at global scope. Segregation of duties is enforced in the database."
          fields={[
            { key: 'user_id', label: 'User', kind: 'user', required: true },
            { key: 'role', label: 'Role', kind: 'select', required: true, options: ASSIGNABLE_ROLES },
            { key: 'scope', label: 'Scope', kind: 'text', isDisabled: true, helper: 'Fixed for this release' },
          ]}
          initial={{ scope: 'global' }}
          submitLabel="Assign role"
          onSubmit={async (v) => {
            await governanceApi.assignRole(v.user_id as string, v.role as StrataRole, 'global');
            invalidate();
          }}
          testId="strata-admin-assign-role-modal"
        />
      ) : null}
    </div>
  );
}

const roleRows = (mine: StrataRole[]): RoleRow[] =>
  ROLE_DOCS.map((r) => ({ ...r, assigned: mine.includes(r.role) }));

const CR_STATUS: Record<StrataChangeRequest['status'], LozengeAppearance> = {
  approved: 'success', rejected: 'removed', pending: 'moved', withdrawn: 'default',
};

interface AuditEventRow {
  id: string;
  entity_table: string | null;
  action: string | null;
  actor_id: string | null;
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

function ChangeLogSection() {
  const crs = useChangeRequests();
  const audit = useStrataAudit();
  const profilesQ = useProfileNames();
  const crList = crs.data ?? [];
  const auditList = ((audit.data ?? []) as AuditEventRow[]).slice(0, 20);

  // Actor column resolves actor_id → profile name (dash when null/unknown).
  const auditColumns: Column<AuditEventRow>[] = [
    {
      id: 'entity', label: 'Entity', width: 24,
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
      id: 'actor', label: 'Actor', width: 18,
      cell: ({ row }) => {
        const name = row.actor_id ? profilesQ.data?.get(row.actor_id)?.name ?? null : null;
        return name ? <span style={metaStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'at', label: 'At', width: 18,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(row.created_at)}</span>,
    },
  ];
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
            columns={auditColumns}
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

// ── Project Card configuration (Execution Reconciliation §G/§N) ─────────────
// Lightweight config engine — no governed envelope (matches the Demand
// module's tab/section-config prior art, not the version/approval workflow
// used by the config-engine tables above). Writes go direct under RLS
// (strategy_office | strata_admin), same as strata_workflow_configs reads.
type PcFormKey = 'new-field' | 'edit-field' | 'new-picklist' | null;

const FIELD_TYPE_OPTIONS = ['text', 'longtext', 'number', 'currency', 'date', 'user', 'reference', 'picklist', 'picklist_multi', 'calculated', 'list'];

function ProjectCardConfigSection({ onError }: { onError: OnError }) {
  const invalidate = useInvalidateStrata();
  const tabsQ = useProjectCardTabConfigs();
  const sectionsQ = useProjectCardSectionConfigs();
  const fieldsQ = useProjectCardFieldConfigs();
  const picklistsQ = useProjectCardPicklists();
  const [form, setForm] = useState<PcFormKey>(null);
  const [editField, setEditField] = useState<StrataProjectCardFieldConfig | null>(null);
  const [picklistKeyFilter, setPicklistKeyFilter] = useState<string | null>(null);

  const tabs = tabsQ.data ?? [];
  const sections = sectionsQ.data ?? [];
  const fields = fieldsQ.data ?? [];
  // Canonical governed picklist keys. The filter lists ALL of them — including
  // lead_business_unit — even when a key has zero values yet, so a strata_admin can
  // select it and add the first value. Previously the filter only listed keys that
  // already had rows, which hid Lead Business Unit entirely and made Team/LBU value
  // maintenance look absent (STRATA-E2E Team/LBU blocker).
  const GOVERNED_PICKLIST_KEYS: string[] = [
    'lead_business_unit', 'delivery_team', 'serving_department', 'delivery_status',
    'strategic_impact', 'aop_mapping', 'benefit_category', 'enabling_team',
    'support_function', 'dependency_status', 'milestone_status',
  ];
  const effectivePicklistKey = picklistKeyFilter && GOVERNED_PICKLIST_KEYS.includes(picklistKeyFilter)
    ? picklistKeyFilter
    : GOVERNED_PICKLIST_KEYS[0];
  const picklists = (picklistsQ.data ?? []).filter((p) => p.picklist_key === effectivePicklistKey);

  const toggleFieldVisible = async (f: StrataProjectCardFieldConfig) => {
    onError(null);
    try {
      await configApi.upsertFieldConfig({ ...f, is_visible: !f.is_visible });
      invalidate();
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };
  const togglePicklistActive = async (p: StrataProjectCardPicklist) => {
    onError(null);
    try {
      await configApi.upsertPicklistValue({ ...p, is_active: !p.is_active });
      invalidate();
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };

  const fieldColumns: Column<StrataProjectCardFieldConfig>[] = [
    { id: 'display_name', label: 'Field', width: 22, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.display_name}</span> },
    { id: 'tab_key', label: 'Tab', width: 14, cell: ({ row }) => <CatalystTag text={labelize(row.tab_key)} /> },
    { id: 'field_type', label: 'Type', width: 12, cell: ({ row }) => <span style={metaStyle}>{labelize(row.field_type)}</span> },
    {
      id: 'visible', label: 'Visible', width: 12,
      cell: ({ row }) => (
        <Button spacing="compact" appearance={row.is_visible ? 'default' : 'subtle'} onClick={() => void toggleFieldVisible(row)} testId={`strata-pc-field-toggle-${row.field_key}`}>
          {row.is_visible ? 'Visible' : 'Hidden'}
        </Button>
      ),
    },
    { id: 'required', label: 'Required', width: 12, cell: ({ row }) => (row.is_required ? <StatusLozenge status="required" label="Required" appearance="moved" /> : <span style={metaStyle}>Optional</span>) },
    { id: 'readonly', label: 'Editable', width: 12, cell: ({ row }) => <span style={metaStyle}>{row.is_readonly ? 'Read-only' : 'Editable'}</span> },
    { id: 'jira', label: 'Jira sync', width: 12, cell: ({ row }) => <span style={metaStyle}>{row.syncs_from_jira ? (row.editable_when_synced ? 'Synced · editable' : 'Synced · locked') : 'Manual only'}</span> },
    {
      id: 'actions', label: '', flex: true, align: 'end',
      cell: ({ row }) => <Button appearance="subtle" spacing="compact" onClick={() => { setEditField(row); setForm('edit-field'); }}>Edit</Button>,
    },
  ];

  const picklistColumns: Column<StrataProjectCardPicklist>[] = [
    { id: 'label', label: 'Label', flex: true, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.label}</span> },
    { id: 'value', label: 'Value', width: 20, cell: ({ row }) => <CatalystInlineCode>{row.value}</CatalystInlineCode> },
    {
      id: 'active', label: 'Status', width: 16,
      cell: ({ row }) => (
        <Button spacing="compact" appearance={row.is_active ? 'default' : 'subtle'} onClick={() => void togglePicklistActive(row)} testId={`strata-pc-picklist-toggle-${row.picklist_key}-${row.value}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={captionStyle}>
        Controls which tabs, sections, fields and dropdown values appear on every Project Card (Execution Reconciliation §G).
        Default template applies when Card Type is left blank.
      </p>

      <StrataPanel title="Tabs" icon={<Layers size={16} />} count={tabs.length} testId="strata-admin-pc-tabs">
        <SectionState query={tabsQ} empty={tabs.length === 0}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <CatalystTag key={t.id} text={`${t.display_name}${t.is_required ? ' · required' : ''}`} />
            ))}
          </div>
        </SectionState>
      </StrataPanel>

      <StrataPanel title="Sections" icon={<Layers size={16} />} count={sections.length} testId="strata-admin-pc-sections">
        <SectionState query={sectionsQ} empty={sections.length === 0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabs.map((t) => {
              const rows = sections.filter((s) => s.tab_key === t.tab_key);
              if (rows.length === 0) return null;
              return (
                <div key={t.tab_key} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...metaStyle, fontWeight: 600, minWidth: 120 }}>{t.display_name}</span>
                  {rows.map((s) => <CatalystTag key={s.id} text={s.name} />)}
                </div>
              );
            })}
          </div>
        </SectionState>
      </StrataPanel>

      <StrataPanel
        title="Fields"
        icon={<Rocket size={16} />}
        count={fields.length}
        noPadding
        actions={<Button spacing="compact" onClick={() => { setEditField(null); setForm('new-field'); }} testId="strata-pc-new-field">New field</Button>}
        testId="strata-admin-pc-fields"
      >
        <SectionState query={fieldsQ} empty={fields.length === 0}>
          <JiraTable<StrataProjectCardFieldConfig> columns={fieldColumns} data={fields} getRowId={(f) => f.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Project Card field configuration" />
        </SectionState>
      </StrataPanel>

      <StrataPanel
        title="Picklists"
        icon={<ListChecks size={16} />}
        count={picklists.length}
        noPadding
        actions={(
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={effectivePicklistKey}
              onChange={(e) => setPicklistKeyFilter(e.target.value)}
              aria-label="Picklist"
              style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${T.border}`, background: T.raised, color: T.text }}
            >
              {GOVERNED_PICKLIST_KEYS.map((k) => <option key={k} value={k}>{labelize(k)}</option>)}
            </select>
            <Button spacing="compact" onClick={() => setForm('new-picklist')} testId="strata-pc-new-picklist-value">New value</Button>
          </div>
        )}
        testId="strata-admin-pc-picklists"
      >
        <SectionState query={picklistsQ} empty={picklists.length === 0}>
          <JiraTable<StrataProjectCardPicklist> columns={picklistColumns} data={picklists} getRowId={(p) => p.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel={`${labelize(effectivePicklistKey)} picklist values`} />
        </SectionState>
      </StrataPanel>

      <StrataFormModal
        open={form === 'new-field' || (form === 'edit-field' && editField != null)}
        onClose={() => { setForm(null); setEditField(null); }}
        title={editField ? 'Edit field' : 'New field'}
        submitLabel="Save"
        fields={[
          { key: 'displayName', label: 'Display name', kind: 'text', required: true },
          { key: 'fieldKey', label: 'Field key', kind: 'text', required: true, helper: 'Matches the Project Card column or optional_fields key' },
          { key: 'tabKey', label: 'Tab', kind: 'select', required: true, options: tabs.map((t) => ({ value: t.tab_key, label: t.display_name })) },
          { key: 'sectionKey', label: 'Section', kind: 'select', options: sections.map((s) => ({ value: s.section_key, label: s.name })) },
          { key: 'fieldType', label: 'Field type', kind: 'select', options: FIELD_TYPE_OPTIONS.map((t) => ({ value: t, label: labelize(t) })) },
          { key: 'isVisible', label: 'Visible', kind: 'checkbox', placeholder: 'Shown on the Project Card by default' },
          { key: 'isRequired', label: 'Required', kind: 'checkbox' },
          { key: 'isReadonly', label: 'Read-only', kind: 'checkbox' },
          { key: 'syncsFromJira', label: 'Syncs from Jira', kind: 'checkbox' },
        ]}
        initial={editField ? {
          displayName: editField.display_name, fieldKey: editField.field_key, tabKey: editField.tab_key,
          sectionKey: editField.section_key, fieldType: editField.field_type, isVisible: editField.is_visible,
          isRequired: editField.is_required, isReadonly: editField.is_readonly, syncsFromJira: editField.syncs_from_jira,
        } : { fieldType: 'text', isVisible: true }}
        onSubmit={async (v) => {
          await configApi.upsertFieldConfig({
            id: editField?.id, card_type: null,
            field_key: String(v.fieldKey ?? editField?.field_key ?? '').trim(),
            tab_key: String(v.tabKey ?? '').trim(),
            section_key: (v.sectionKey as string) || null,
            display_name: String(v.displayName ?? '').trim(),
            field_type: (v.fieldType as string) || 'text',
            is_visible: Boolean(v.isVisible),
            is_required: Boolean(v.isRequired),
            is_readonly: Boolean(v.isReadonly),
            syncs_from_jira: Boolean(v.syncsFromJira),
          });
          invalidate();
        }}
        testId="strata-pc-field-form-modal"
      />

      <StrataFormModal
        open={form === 'new-picklist'}
        onClose={() => setForm(null)}
        title="New picklist value"
        submitLabel="Create"
        fields={[
          {
            key: 'picklistKey', label: 'Picklist', kind: 'select', required: true,
            options: GOVERNED_PICKLIST_KEYS.map((k) => ({ value: k, label: labelize(k) })),
          },
          { key: 'value', label: 'Value (stored)', kind: 'text', required: true },
          { key: 'label', label: 'Label (displayed)', kind: 'text', required: true },
        ]}
        initial={{ picklistKey: effectivePicklistKey }}
        onSubmit={async (v) => {
          await configApi.upsertPicklistValue({
            picklist_key: String(v.picklistKey ?? '').trim(),
            value: String(v.value ?? '').trim(),
            label: String(v.label ?? '').trim(),
            is_active: true,
          });
          invalidate();
        }}
        testId="strata-pc-picklist-form-modal"
      />
    </div>
  );
}

// ── Section registry + page ──────────────────────────────────────────────────
// ── Notifications (CAT-STRATA-CLOSEOUT-20260710-001 W3) ───────────────────────
function NotificationsSection({ onError }: { onError: OnError }) {
  const rulesQ = useStrataNotificationRules();
  const roles = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  // UI gating only — strata_set_notification_rule also authorises platform admins server-side.
  const isStrataAdmin = (roles.data ?? []).includes('strata_admin');
  const rules = (rulesQ.data ?? []) as StrataNotificationRule[];

  const toggle = async (rule: StrataNotificationRule) => {
    setBusyEvent(rule.event_type);
    onError(null);
    try {
      await governanceApi.setNotificationRule(rule.event_type, !rule.enabled);
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyEvent(null);
    }
  };

  return (
    <StrataPanel title="Notifications" icon={<Bell size={16} />} count={rules.length} testId="strata-admin-notifications">
      <p style={captionStyle}>
        In-app alerts for pending approvals, assignments, blockers and validation requests.
        Toggling a rule takes effect immediately and is written to the audit trail (admin only).
      </p>
      {rulesQ.isLoading ? (
        <div style={{ padding: 16 }}><Spinner size="small" /></div>
      ) : rules.length === 0 ? (
        <EmptyState size="compact" header="No notification rules" description="Nothing has been configured in this section." />
      ) : (
        rules.map((r) => (
          <div
            key={r.event_type}
            data-testid={`strata-admin-notif-rule-${r.event_type}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--ds-space-100) var(--ds-space-050)', borderBottom: `1px solid ${T.border}` }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: T.text }}>{r.label}</span>
                <CatalystTag text={labelize(r.audience.replace('role:', ''))} />
              </div>
              {r.description ? <div style={{ ...metaStyle, marginTop: 'var(--ds-space-025)' }}>{r.description}</div> : null}
            </div>
            <Toggle
              isChecked={r.enabled}
              isDisabled={!isStrataAdmin || busyEvent === r.event_type}
              onChange={() => void toggle(r)}
              label={`Toggle ${r.label}`}
            />
          </div>
        ))
      )}
    </StrataPanel>
  );
}

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
  { key: 'project-card', label: 'Project Card', icon: Rocket, render: (e) => <ProjectCardConfigSection onError={e} /> },
  { key: 'roles', label: 'Roles', icon: Users, render: (e) => <RolesSection onError={e} /> },
  { key: 'notifications', label: 'Notifications', icon: Bell, render: (e) => <NotificationsSection onError={e} /> },
  { key: 'change-log', label: 'Change log', icon: Clock, render: () => <ChangeLogSection /> },
];

// ── Config landing (anchor 03) — governed control plane, bare /strata/admin ──
// Reorganises the 12 config sections by CONSEQUENCE. Each domain card routes to
// its primary section today (:section); measurement/data/access repoint to their
// own domain pages as those slices land. Pending counts + change log are the
// governance signal — nothing is fabricated.
const DOMAINS: Array<{
  key: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  governs: string;
  to: string;
  sectionLabels: string[];
}> = [
  {
    key: 'strategy-framework', name: 'Strategy framework', icon: Layers,
    governs: 'Perspectives — the scoring lens every scorecard rolls up through.',
    to: Routes.strata.adminSection('perspectives'), sectionLabels: ['Perspectives'],
  },
  {
    key: 'measurement', name: 'Measurement', icon: Scale,
    governs: 'Scorecard models, threshold bands and KPI formulas — how performance is calculated and rated.',
    to: Routes.strata.adminMeasurement(), sectionLabels: ['Perspectives', 'Scorecard models', 'Thresholds', 'KPI types'],
  },
  {
    key: 'value-governance', name: 'Value & governance', icon: Gem,
    governs: 'Benefit taxonomy and stage-gate models — how value is classified and approved.',
    to: Routes.strata.adminSection('value-taxonomy'), sectionLabels: ['Value taxonomy', 'Gates'],
  },
  {
    key: 'data-integration', name: 'Data & integration', icon: Upload,
    governs: 'Registered sources and the upload templates/contracts that feed actuals into STRATA.',
    to: Routes.strata.adminData(), sectionLabels: ['Sources', 'Upload templates'],
  },
  {
    key: 'workflow-access', name: 'Workflow & access', icon: Users,
    governs: 'Lifecycle workflows and the role assignments that decide who can act.',
    to: Routes.strata.adminAccess(), sectionLabels: ['Role assignments', 'Workflow transitions'],
  },
  {
    key: 'reference-display', name: 'Reference & display', icon: Rocket,
    governs: 'Project Card layout and notification rules — how configuration surfaces to end users.',
    to: Routes.strata.adminSection('project-card'), sectionLabels: ['Project Card', 'Notifications'],
  },
];

const countPending = (rows?: ReadonlyArray<{ status: GovernedStatus }>): number =>
  (rows ?? []).filter((r) => r.status === 'pending_approval').length;

function DomainCard({ domain, pending, onOpen }: {
  domain: (typeof DOMAINS)[number];
  pending: number;
  onOpen: () => void;
}) {
  const Icon = domain.icon;
  return (
    <button
      type="button"
      className="strata-domain-card"
      onClick={onOpen}
      data-testid={`strata-admin-domain-${domain.key}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', width: '100%',
        border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, cursor: 'pointer',
        background: T.raised, color: T.text, font: 'inherit',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ display: 'inline-flex', color: T.subtle }}><Icon size={18} /></span>
          <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{domain.name}</strong>
        </span>
        {pending > 0 ? (
          <Lozenge appearance="moved">{pending} pending</Lozenge>
        ) : null}
      </span>
      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, lineHeight: 'var(--ds-line-height-body)' }}>
        {domain.governs}
      </span>
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {domain.sectionLabels.map((l) => <CatalystTag key={l} text={l} />)}
      </span>
    </button>
  );
}

function AdminLanding() {
  const navigate = useNavigate();
  const perspectives = usePerspectives();
  const models = useScorecardModels();
  const thresholds = useThresholdSchemes();
  const valueCats = useValueCategories();
  const gates = useGateModels();
  const kpiTypes = useKpiTypes();
  const templates = useUploadTemplates();
  const workflows = useWorkflowConfigs();
  const roles = useStrataRoles();

  const pendingByDomain: Record<string, number> = {
    'strategy-framework': countPending(perspectives.data),
    measurement: countPending(models.data) + countPending(thresholds.data) + countPending(kpiTypes.data),
    'value-governance': countPending(valueCats.data) + countPending(gates.data),
    'data-integration': countPending(templates.data),
    'workflow-access': countPending(workflows.data),
    'reference-display': 0,
  };
  const totalPending = Object.values(pendingByDomain).reduce((a, b) => a + b, 0);
  const isStrataAdmin = (roles.data ?? []).includes('strata_admin');
  const pendingDomains = DOMAINS.filter((d) => pendingByDomain[d.key] > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <style>{
        '.strata-domain-card:hover{background:var(--ds-surface-raised-hovered);border-color:var(--ds-border-bold);}'
        + '.strata-domain-card:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:2px;}'
      }</style>

      {/* Governance context line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Lozenge appearance="new" isBold>Governed control plane</Lozenge>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          {isStrataAdmin
            ? 'You are strata_admin — every change here is versioned, approved and audited.'
            : 'Every change here is versioned, approved and audited.'}
        </span>
      </div>

      {/* Approval band — real pending_approval counts, routed to where they're actioned */}
      <div
        data-testid="strata-admin-approval-band"
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, background: T.sunken,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {totalPending > 0
            ? <Lozenge appearance="moved" isBold>Awaiting approval</Lozenge>
            : <Lozenge appearance="success" isBold>All approved</Lozenge>}
          <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>
            {totalPending > 0
              ? `${totalPending} governed change${totalPending === 1 ? '' : 's'} need an independent approver`
              : 'Nothing is awaiting review'}
          </strong>
        </div>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          Segregation of duties is enforced in the database — the person who drafted a change cannot approve it.
        </span>
        {pendingDomains.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {pendingDomains.map((d) => (
              <Button
                key={d.key}
                spacing="compact"
                onClick={() => navigate(d.to)}
                testId={`strata-admin-approval-jump-${d.key}`}
              >
                {d.name} · {pendingByDomain[d.key]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Consequence-domain cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {DOMAINS.map((d) => (
          <DomainCard key={d.key} domain={d} pending={pendingByDomain[d.key]} onOpen={() => navigate(d.to)} />
        ))}
      </div>

      {/* Change log + audit trail (reused canonical) */}
      <ChangeLogSection />
    </div>
  );
}

export default function StrataAdminConfigPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  const idx = SECTIONS.findIndex((s) => s.key === section);
  const selected = idx >= 0 ? idx : 0;
  // Deep-linked section (/strata/admin/:section) is a detail sub-view — the
  // breadcrumb carries "Administration / <Section>"; bare /strata/admin is index.
  const sectionEntry = section && idx >= 0 ? SECTIONS[idx] : null;

  // Bare /strata/admin → governed control-plane landing (anchor 03, P5-D0).
  if (!section) {
    return (
      <StrataPageShell title="Configuration" docTitle="Configuration" testId="strata-admin-chrome">
        <AdminLanding />
      </StrataPageShell>
    );
  }

  return (
    <StrataPageShell
      trail={sectionEntry ? [
        { text: 'Administration', href: Routes.strata.admin() },
        { text: sectionEntry.label },
      ] : undefined}
      docTitle={sectionEntry ? `${sectionEntry.label} · Administration` : undefined}
      testId="strata-admin-chrome"
    >
      <Tabs
        id="strata-admin-tabs"
        selected={selected}
        onChange={(i) => { setActionError(null); navigate(Routes.strata.adminSection(SECTIONS[i].key)); }}
      >
        {/* 11 tabs overflow narrow viewports — scroll the strip instead of
          * wrapping/clipping (Jira admin parity). */}
        <div style={{ overflowX: 'auto', minWidth: 0 }}>
          <TabList>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Tab key={s.key}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <Icon size={14} />
                    {s.label}
                  </span>
                </Tab>
              );
            })}
          </TabList>
        </div>
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
    </StrataPageShell>
  );
}
