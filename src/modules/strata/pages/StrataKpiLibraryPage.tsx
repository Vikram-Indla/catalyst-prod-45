/**
 * STRATA KPI/OKR Library — /strata/kpis (CAT-STRATA-20260705-001).
 * Governed KPI dictionary (canonical JiraTable) + OKR panel with lazy key results.
 * UI never computes achievement/RAG — per-row values come from
 * strata_calc_kpi_achievement via useKpiAchievement. Unknowns render '—'.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { OkrRow, StrataBandBar, StrataBandLozenge, StrataChipMenu, StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtPct, labelize } from '@/modules/strata/components/format';
import type { GovernedStatus, StrataKpi, StrataOkr } from '@/modules/strata/types';
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
function DirectionCell({ direction }: { direction: StrataKpi['direction'] }) {
  const icon =
    direction === 'higher_better' ? <ArrowUp size={14} color="var(--ds-icon-subtle)" />
    : direction === 'lower_better' ? <ArrowDown size={14} color="var(--ds-icon-subtle)" />
    : direction === 'band' ? <Scale size={14} color="var(--ds-icon-subtle)" />
    : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>
      {icon}
      {DIRECTION_LABEL[direction] ?? labelize(direction)}
    </span>
  );
}

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

/** Validator cell — resolved name, or attestation icon; never the literal "Set" (S-120). */
function ValidatorCell({ validatorId, profiles }: { validatorId: string | null; profiles?: Map<string, StrataProfileRef> }) {
  if (!validatorId) return <Dash />;
  const p = profiles?.get(validatorId);
  if (p?.name) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Avatar size="xsmall" name={p.name} src={p.avatarUrl ?? undefined} />
        <span style={{ color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      </span>
    );
  }
  return (
    <Tooltip content="Validator assigned">
      <span style={{ display: 'inline-flex' }} aria-label="Validator assigned">
        <CheckCircle2 size={16} color="var(--ds-icon-success)" />
      </span>
    </Tooltip>
  );
}

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

  const canAuthor = (rolesQ.data ?? []).some((r) => (CREATE_ROLES as readonly string[]).includes(r));

  const dataSourceNameById = useMemo(() => {
    const m = new Map<string, string>();
    (dataSourcesQ.data ?? []).forEach((d) => m.set(d.id, d.name));
    return m;
  }, [dataSourcesQ.data]);

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

  const columns = useMemo<Column<StrataKpi>[]>(() => [
    {
      id: 'name',
      label: 'KPI',
      /* Fixed 32 units (384px) instead of flex: JiraTable reserves a hard 640px
       * floor for flex columns, which forces horizontal scroll and visually
       * "chops" the trailing columns on a 9-column dictionary. table-layout
       * fixed still distributes any spare width across all columns. */
      width: 32,
      sortable: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <KpiNameLink row={row} onOpen={() => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }} />
      ),
    },
    {
      id: 'unit',
      label: 'Unit',
      width: 5,
      cell: ({ row }) => (row.unit ? <span style={{ color: T.subtle }}>{row.unit}</span> : <Dash />),
    },
    {
      id: 'direction',
      label: 'Direction',
      width: 10,
      cell: ({ row }) => (row.direction ? <DirectionCell direction={row.direction} /> : <Dash />),
    },
    {
      id: 'frequency',
      label: 'Frequency',
      width: 8,
      sortable: true,
      cell: ({ row }) => (row.frequency ? <span style={{ color: T.subtle }}>{labelize(row.frequency)}</span> : <Dash />),
    },
    {
      id: 'entry_method',
      label: 'Entry',
      width: 8,
      cell: ({ row }) => (row.entry_method ? <CatalystTag text={labelize(row.entry_method)} /> : <Dash />),
    },
    {
      id: 'status',
      label: 'Status',
      width: 9,
      sortable: true,
      cell: ({ row }) => <StrataGovernedStatusLozenge status={row.status} />,
    },
    {
      id: 'achievement',
      label: 'Achievement',
      width: 13,
      cell: ({ row }) => <KpiAchievementCell kpiId={row.id} />,
    },
    {
      id: 'validator',
      label: 'Validator',
      width: 9,
      cell: ({ row }) => <ValidatorCell validatorId={row.validator_id} profiles={profilesQ.data} />,
    },
    {
      id: 'data_source',
      label: 'Data source',
      width: 9,
      cell: ({ row }) =>
        row.data_source_id
          ? (
            <span style={{ color: T.subtle, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dataSourceNameById.get(row.data_source_id) ?? '—'}
            </span>
          )
          : <Dash />,
    },
  ], [navigate, dataSourceNameById, profilesQ.data]);

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
                    onClick={() => setNewKpiOpen(true)}
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
        description="Creates a draft KPI in the governed dictionary. Approval is a separate governed step."
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'KPI name' },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
          { key: 'frequency', label: 'Frequency', kind: 'select', options: FREQUENCY_OPTIONS },
          { key: 'entryMethod', label: 'Entry method', kind: 'select', options: ENTRY_METHOD_OPTIONS },
        ]}
        initial={{ direction: 'higher_better', frequency: 'quarterly', entryMethod: 'upload' }}
        submitLabel="Create KPI"
        onSubmit={async (v) => {
          await kpiApi.createKpi({
            name: String(v.name),
            unit: v.unit ? String(v.unit) : undefined,
            direction: v.direction ? String(v.direction) : undefined,
            frequency: v.frequency ? String(v.frequency) : undefined,
            entryMethod: v.entryMethod ? String(v.entryMethod) : undefined,
          });
          invalidate();
        }}
        testId="strata-new-kpi-modal"
      />
    </StrataPageShell>
  );
}
