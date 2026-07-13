/**
 * STRATA KPI/OKR Library — /strata/kpis (CAT-STRATA-20260705-001).
 * Governed KPI dictionary (canonical JiraTable) + OKR panel with lazy key results.
 * UI never computes achievement/RAG — per-row values come from
 * strata_calc_kpi_achievement via useKpiAchievement. Unknowns render '—'.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Button, CatalystTag,
  EmptyState, Lozenge, SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import {
  Activity, ArrowDown, ArrowUp, CheckCircle2, Plus, Scale, Target,
} from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import {
  useDataSources, useInvalidateStrata, useKpiAchievement, useKpis, useOkrs, useProfileNames, useStrataContext, useStrataRoles, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { OkrRow, StrataBandBar, StrataBandLozenge, StrataChipMenu, StrataPageShell, StrataPanel, StrataTrendSpark, T } from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtDate, fmtPct, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { GovernedStatus, StrataKpi, StrataKpiActual, StrataOkr } from '@/modules/strata/types';
import type { StrataProfileRef } from '@/modules/strata/hooks/useStrata';

/** UI affordance gating only — server RPCs enforce the real role rules (SoD etc.). */
const CREATE_ROLES = ['strategy_office', 'kpi_owner', 'strata_admin'] as const;

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

/** Shape returned by strata_calc_kpi_achievement — rendered verbatim, never recomputed. */
interface KpiAchievementPayload {
  achievement: number | null;
  actual: number | null;
  target: number | null;
  status_key: string | null;
  has_data?: boolean;
  confidence?: number | null;
}

const GOVERNED_LOZENGE: Record<GovernedStatus, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  approved: { label: 'Approved', appearance: 'success' },
  draft: { label: 'Draft', appearance: 'default' },
  pending_approval: { label: 'Pending approval', appearance: 'moved' },
  retired: { label: 'Retired', appearance: 'removed' },
  superseded: { label: 'Superseded', appearance: 'default' },
};

export function StrataGovernedStatusLozenge({ status }: { status: GovernedStatus | string | null | undefined }) {
  if (!status) return <span style={{ color: T.subtlest }}>—</span>;
  const cfg = GOVERNED_LOZENGE[status as GovernedStatus];
  if (!cfg) return <Lozenge appearance="default">{labelize(String(status))}</Lozenge>;
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

/** Short labels — the arrow icon already carries the "is better" semantics;
 *  the long phrasing ellipsized inside the 10-unit column. */
const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher',
  lower_better: 'Lower',
  band: 'Band',
  manual: 'Manual',
};

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

/** Direction cell — icon + label (S-130). */
/** Subtle skeleton bar shown while a per-row achievement RPC resolves (S-123). */
function CellSkeleton() {
  return <span aria-hidden style={{ display: 'inline-block', width: 64, height: 8, borderRadius: 4, background: T.neutral }} />;
}

/** KPI name — brand-text link with hover underline when a slug exists (S-121). */
function KpiNameLink({ row, onOpen }: { row: StrataKpi; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  if (!row.slug) {
    return (
      <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>
        {row.name}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        font: 'inherit', fontWeight: 600, color: T.brandText, textAlign: 'left',
        fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)',
        textDecoration: hover ? 'underline' : 'none',
      }}
    >
      {row.name}
    </button>
  );
}

/** Per-row achievement — server-computed via strata_calc_kpi_achievement. */
function KpiAchievementCell({ kpiId }: { kpiId: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiAchievement(kpiId, activePeriod?.id);
  if (!activePeriod) return <Dash />;
  if (q.isLoading) return <CellSkeleton />;
  const a = (q.data ?? null) as KpiAchievementPayload | null;
  if (q.isError || !a || a.achievement == null) return <Dash />;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(a.achievement)}</span>
        {a.status_key ? <StrataBandLozenge bandKey={a.status_key} /> : null}
      </span>
      <span style={{ width: 64 }}>
        <StrataBandBar value={a.achievement} bandKey={a.status_key} height={4} />
      </span>
    </span>
  );
}

/** Per-actual validation state (validated/pending/rejected/quarantined). */
const VALIDATION_APPEARANCE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  validated: 'success', pending: 'moved', rejected: 'removed', quarantined: 'moved',
};
function ValidationLozenge({ status }: { status?: string | null }) {
  if (!status) return <Dash />;
  return <Lozenge appearance={VALIDATION_APPEARANCE[status] ?? 'default'}>{labelize(status)}</Lozenge>;
}

/** Per-row actuals — same queryKey across cells of a row so React Query dedupes
 *  to one fetch (feeds Trend spark + Validation + Freshness). */
function useKpiActualsLite(kpiId: string) {
  return useQuery({ queryKey: ['strata', 'kpi-actuals', kpiId], queryFn: () => kpiApi.actuals(kpiId), staleTime: 30_000 });
}

/** Actual / Target for the active period (verdict-first column, anchor 16). */
function KpiActualTargetCell({ kpiId, unit }: { kpiId: string; unit: string | null }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiAchievement(kpiId, activePeriod?.id);
  if (!activePeriod) return <Dash />;
  if (q.isLoading) return <CellSkeleton />;
  const a = (q.data ?? null) as KpiAchievementPayload | null;
  if (!a || (a.actual == null && a.target == null)) return <Dash />;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: T.subtle, fontSize: 'var(--ds-font-size-100)', whiteSpace: 'nowrap' }}>
      <strong style={{ color: T.text, fontWeight: 600 }}>{a.actual != null ? fmtUnit(a.actual, unit) : '—'}</strong>
      {' / '}{a.target != null ? fmtUnit(a.target, unit) : '—'}
    </span>
  );
}

/** Trend spark from the KPI's actuals (ascending by submission). */
function KpiTrendCell({ kpiId, direction }: { kpiId: string; direction: string }) {
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = (q.data ?? []) as StrataKpiActual[];
  const points = [...acts].sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1)).map((a) => a.value);
  if (points.filter((v) => v != null).length < 2) return <Dash />;
  return <StrataTrendSpark points={points} higherIsBetter={direction !== 'lower_better'} />;
}

/** Latest validation state for the active period (else most recent actual). */
function KpiValidationCell({ kpiId }: { kpiId: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = (q.data ?? []) as StrataKpiActual[];
  const cur = acts.find((a) => a.period_id === activePeriod?.id) ?? acts[0] ?? null;
  return cur ? <ValidationLozenge status={cur.validation_status} /> : <Dash />;
}

/** Freshness — most recent actual submission date. */
function KpiFreshnessCell({ kpiId }: { kpiId: string }) {
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = (q.data ?? []) as StrataKpiActual[];
  if (acts.length === 0) return <Dash />;
  const latest = acts.reduce((mx, a) => (a.submitted_at > mx ? a.submitted_at : mx), acts[0].submitted_at);
  return <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)', whiteSpace: 'nowrap' }}>{fmtDate(latest)}</span>;
}

/** Owner (accountable owner) — resolved name + avatar. */
function KpiOwnerCell({ ownerId, profiles }: { ownerId: string | null; profiles?: Map<string, StrataProfileRef> }) {
  if (!ownerId) return <Dash />;
  const p = profiles?.get(ownerId);
  return p?.name ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Avatar size="xsmall" name={p.name} src={p.avatarUrl ?? undefined} />
      <span style={{ color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
    </span>
  ) : <Dash />;
}

/** Validator cell — resolved name, or attestation icon; never the literal "Set" (S-120). */
// ── OKR panel — OkrRow/KeyResultsList/krProgressFraction/OKR_STATUS_LOZENGE ──
//    now live in components/shared.tsx (canonical, shared with Theme/Objective
//    detail's OKR Performance panel — CAT-STRATA-THEME-DETAIL-20260710-001
//    Slice 2). ──

function OkrPanel() {
  const { activeCycle } = useStrataContext();
  const okrsQ = useOkrs();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const kpisQ = useKpis();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newOkrOpen, setNewOkrOpen] = useState(false);
  const [krOkr, setKrOkr] = useState<StrataOkr | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (CREATE_ROLES as readonly string[]).includes(r));

  const elementNameById = useMemo(() => {
    const m = new Map<string, string>();
    (elementsQ.data ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [elementsQ.data]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const okrs = okrsQ.data ?? [];

  return (
    <StrataPanel
      title="OKRs"
      icon={<Target size={16} />}
      count={okrs.length}
      testId="strata-okr-panel"
      actions={canAuthor ? (
        <Button
          appearance="default"
          spacing="compact"
          iconBefore={<Plus size={14} />}
          onClick={() => setNewOkrOpen(true)}
          testId="strata-new-okr"
        >
          New OKR
        </Button>
      ) : undefined}
    >
      {okrsQ.isLoading ? (
        <Spinner size="medium" aria-label="Loading OKRs" />
      ) : okrsQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load OKRs">
          <p>{(okrsQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : okrs.length === 0 ? (
        <EmptyState size="compact" header="No OKRs yet" description="OKRs linked to strategy objectives will appear here." />
      ) : (
        <div>
          {okrs.map((okr) => (
            <OkrRow
              key={okr.id}
              okr={okr}
              objectiveName={okr.objective_element_id ? (elementNameById.get(okr.objective_element_id) ?? null) : null}
              isOpen={expanded.has(okr.id)}
              onToggle={() => toggle(okr.id)}
              onAddKeyResult={canAuthor ? () => setKrOkr(okr) : undefined}
            />
          ))}
        </div>
      )}

      {/* New OKR — server RPC validates; errors render in-modal */}
      <StrataFormModal
        open={newOkrOpen}
        onClose={() => setNewOkrOpen(false)}
        title="New OKR"
        description="Creates a draft OKR in the active cycle."
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'OKR objective statement' },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          {
            key: 'objectiveElementId', label: 'Objective element', kind: 'select',
            options: (elementsQ.data ?? []).map((e) => ({ value: e.id, label: e.name })),
            helper: 'Optional link to a strategy objective',
          },
        ]}
        submitLabel="Create OKR"
        onSubmit={async (v) => {
          await kpiApi.createOkr({
            name: String(v.name),
            cycleId: activeCycle?.id,
            objectiveElementId: v.objectiveElementId ? String(v.objectiveElementId) : undefined,
            ownerId: v.ownerId ? String(v.ownerId) : undefined,
          });
          invalidate();
        }}
        testId="strata-new-okr-modal"
      />

      {/* Add key result — server RPC validates; errors render in-modal */}
      <StrataFormModal
        open={krOkr !== null}
        onClose={() => setKrOkr(null)}
        title={krOkr ? `Add key result · ${krOkr.name}` : 'Add key result'}
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Measurable key result' },
          {
            key: 'kpiId', label: 'Linked KPI', kind: 'select',
            options: (kpisQ.data ?? []).map((k) => ({ value: k.id, label: k.name })),
            helper: 'Optional governed KPI backing this key result',
          },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'baseline', label: 'Baseline', kind: 'number' },
          { key: 'target', label: 'Target', kind: 'number' },
          { key: 'currentValue', label: 'Current value', kind: 'number' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
        ]}
        initial={{ direction: 'higher_better' }}
        submitLabel="Add key result"
        onSubmit={async (v) => {
          if (!krOkr) return;
          await kpiApi.createKeyResult({
            okrId: krOkr.id,
            name: String(v.name),
            kpiId: v.kpiId ? String(v.kpiId) : undefined,
            unit: v.unit ? String(v.unit) : undefined,
            baseline: v.baseline != null ? Number(v.baseline) : undefined,
            target: v.target != null ? Number(v.target) : undefined,
            currentValue: v.currentValue != null ? Number(v.currentValue) : undefined,
            direction: v.direction ? String(v.direction) : undefined,
          });
          invalidate();
        }}
        testId="strata-add-kr-modal"
      />
    </StrataPanel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const STATUS_FILTER_OPTIONS: Array<{ value: GovernedStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'retired', label: 'Retired' },
  { value: 'superseded', label: 'Superseded' },
];

export default function StrataKpiLibraryPage() {
  const navigate = useNavigate();
  const kpisQ = useKpis();
  const dataSourcesQ = useDataSources();
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GovernedStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [newKpiOpen, setNewKpiOpen] = useState(false);
  // Holds the id of a KPI already created this modal session, so a resubmit
  // after a failed owner/link write (e.g. server SoD rejection) does not create
  // a duplicate draft — createKpi fires at most once until the modal reopens.
  const newKpiIdRef = useRef<string | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (CREATE_ROLES as readonly string[]).includes(r));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = (kpisQ.data ?? []).filter((k) =>
      (statusFilter === 'all' || k.status === statusFilter) &&
      (!term || k.name.toLowerCase().includes(term)));
    const dir = sortOrder === 'ASC' ? 1 : -1;
    // Numeric-aware sort (S-127): compare numbers as numbers, everything else lexically.
    rows = [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return rows;
  }, [kpisQ.data, search, statusFilter, sortKey, sortOrder]);

  // Verdict-first columns (anchor 16): KPI · Achievement · Actual/Target · Trend ·
  // Validation · Owner · Freshness — replacing the field-dump rows. Achievement +
  // Actual/Target come from the per-row achievement RPC; Trend/Validation/Freshness
  // from a per-row actuals fetch (deduped by React Query).
  const columns = useMemo<Column<StrataKpi>[]>(() => [
    {
      id: 'name',
      label: 'KPI',
      width: 26,
      sortable: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <KpiNameLink row={row} onOpen={() => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }} />
          <StrataGovernedStatusLozenge status={row.status} />
        </span>
      ),
    },
    {
      id: 'achievement',
      label: 'Achievement',
      width: 14,
      cell: ({ row }) => <KpiAchievementCell kpiId={row.id} />,
    },
    {
      id: 'actual_target',
      label: 'Actual / Target',
      width: 14,
      cell: ({ row }) => <KpiActualTargetCell kpiId={row.id} unit={row.unit} />,
    },
    {
      id: 'trend',
      label: 'Trend',
      width: 10,
      cell: ({ row }) => <KpiTrendCell kpiId={row.id} direction={row.direction} />,
    },
    {
      id: 'validation',
      label: 'Validation',
      width: 11,
      cell: ({ row }) => <KpiValidationCell kpiId={row.id} />,
    },
    {
      id: 'owner',
      label: 'Owner',
      width: 14,
      cell: ({ row }) => <KpiOwnerCell ownerId={row.accountable_owner_id} profiles={profilesQ.data} />,
    },
    {
      id: 'freshness',
      label: 'Freshness',
      width: 10,
      sortable: false,
      cell: ({ row }) => <KpiFreshnessCell kpiId={row.id} />,
    },
  ], [navigate, profilesQ.data]);

  const statusLabel = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';

  return (
    <StrataPageShell testId="strata-kpi-library-chrome">
      {kpisQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load KPI library">
          <p>{(kpisQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel
            title="KPI dictionary"
            icon={<Activity size={16} />}
            count={filtered.length}
            testId="strata-kpi-library-panel"
            noPadding
            actions={
              <>
                <div style={{ width: 240 }}>
                  <Textfield
                    spacing="compact"
                    placeholder="Search KPIs by name"
                    value={search}
                    onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                    aria-label="Search KPIs by name"
                  />
                </div>
                <StrataChipMenu
                  value={statusLabel}
                  active={statusFilter !== null}
                  aria-label="Filter KPIs by status"
                  options={STATUS_FILTER_OPTIONS.map((o) => ({
                    key: String(o.value),
                    label: o.label,
                    isSelected: o.value === statusFilter,
                    onClick: () => setStatusFilter(o.value),
                  }))}
                />
                {canAuthor ? (
                  <Button
                    appearance="primary"
                    spacing="compact"
                    iconBefore={<Plus size={14} />}
                    onClick={() => { newKpiIdRef.current = null; setNewKpiOpen(true); }}
                    testId="strata-new-kpi"
                  >
                    New KPI
                  </Button>
                ) : null}
              </>
            }
          >
            <JiraTable<StrataKpi>
              columns={columns}
              data={filtered}
              getRowId={(row) => row.id}
              onRowClick={(row) => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSortChange={(key, order) => { setSortKey(key); setSortOrder(order); }}
              density="compact"
              isLoading={kpisQ.isLoading}
              ariaLabel="KPI dictionary"
              emptyView={
                <EmptyState
                  size="compact"
                  header="No KPIs found"
                  description={search || statusFilter !== 'all'
                    ? 'No KPIs match the current search or status filter.'
                    : 'Approved KPIs in the governed dictionary will appear here.'}
                />
              }
            />
          </StrataPanel>

          <OkrPanel />
        </div>
      )}

      {/* New KPI — draft governed entry; approval is a separate step */}
      <StrataFormModal
        open={newKpiOpen}
        onClose={() => setNewKpiOpen(false)}
        title="New KPI"
        description="Creates a draft KPI in the governed dictionary. Assign owners now, or later from the KPI page. Linking to the strategy hierarchy happens after approval, from the Strategy Room. Approval is a separate governed step."
        width="large"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'KPI name' },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
          { key: 'frequency', label: 'Frequency', kind: 'select', options: FREQUENCY_OPTIONS },
          { key: 'entryMethod', label: 'Entry method', kind: 'select', options: ENTRY_METHOD_OPTIONS },
          { key: 'isStrategic', label: 'Strategic KPI', kind: 'checkbox', helper: 'Requires a governed strategy association (cycle/theme/objective/perspective) before approval (STRATA-E2E-010)' },
          { key: 'accountableOwnerId', label: 'Accountable owner', kind: 'user' },
          { key: 'dataOwnerId', label: 'Data owner', kind: 'user' },
          { key: 'reporterId', label: 'Reporter', kind: 'user' },
          { key: 'validatorId', label: 'Validator', kind: 'user', helper: 'Must differ from the submitter — enforced server-side' },
          { key: 'escalationOwnerId', label: 'Escalation owner', kind: 'user' },
        ]}
        initial={{ direction: 'higher_better', frequency: 'quarterly', entryMethod: 'upload', isStrategic: false }}
        submitLabel="Create KPI"
        onSubmit={async (v) => {
          // Create at most once per modal session (see newKpiIdRef): a failed
          // owner/link write below keeps the modal open, and a resubmit must
          // reuse the already-created draft rather than making a second one.
          if (!newKpiIdRef.current) {
            newKpiIdRef.current = await kpiApi.createKpi({
              name: String(v.name),
              unit: v.unit ? String(v.unit) : undefined,
              direction: v.direction ? String(v.direction) : undefined,
              frequency: v.frequency ? String(v.frequency) : undefined,
              entryMethod: v.entryMethod ? String(v.entryMethod) : undefined,
              isStrategic: Boolean(v.isStrategic),
            });
          }
          const newKpiId = newKpiIdRef.current;
          // Owners are a separate governed write (strata_update_kpi) — only fire
          // when at least one was set, so an unowned draft still creates cleanly.
          const hasOwner = v.accountableOwnerId || v.dataOwnerId || v.reporterId
            || v.validatorId || v.escalationOwnerId;
          if (hasOwner) {
            await kpiApi.updateKpi(newKpiId, {
              accountableOwnerId: v.accountableOwnerId ? String(v.accountableOwnerId) : undefined,
              dataOwnerId: v.dataOwnerId ? String(v.dataOwnerId) : undefined,
              reporterId: v.reporterId ? String(v.reporterId) : undefined,
              validatorId: v.validatorId ? String(v.validatorId) : undefined,
              escalationOwnerId: v.escalationOwnerId ? String(v.escalationOwnerId) : undefined,
            });
          }
          // Full success — clear so the next New KPI opens a fresh create.
          newKpiIdRef.current = null;
          invalidate();
        }}
        testId="strata-new-kpi-modal"
      />
    </StrataPageShell>
  );
}
