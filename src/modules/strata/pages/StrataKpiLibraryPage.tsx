/**
 * STRATA KPI/OKR Library — /strata/kpis (CAT-STRATA-20260705-001).
 * Governed KPI dictionary (canonical JiraTable) + OKR panel with lazy key results.
 * UI never computes achievement/RAG — per-row values come from
 * strata_calc_kpi_achievement via useKpiAchievement. Unknowns render '—'.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Button, CatalystTag,
  EmptyState, Lozenge, ProgressBar, SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import {
  Activity, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronRight, Scale, Target,
} from '@/lib/atlaskit-icons';
import { PageContainer } from '@/components/shared/PageContainer';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import {
  useDataSources, useKpiAchievement, useKpis, useOkrs, useProfileNames, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { StrataBandBar, StrataBandLozenge, StrataChipMenu, StrataPageChrome, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtPct, fmtRatioPct, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { GovernedStatus, StrataKeyResult, StrataKpi, StrataOkr } from '@/modules/strata/types';
import type { StrataProfileRef } from '@/modules/strata/hooks/useStrata';

const STALE = 30_000;

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

const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
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
    return <span style={{ fontWeight: 600, color: T.text }}>{row.name}</span>;
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

// ── OKR panel ────────────────────────────────────────────────────────────────
const OKR_STATUS_LOZENGE: Record<StrataOkr['status'], { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  draft: { label: 'Draft', appearance: 'default' },
  active: { label: 'Active', appearance: 'inprogress' },
  closed: { label: 'Closed', appearance: 'default' },
};

/** Display-only progress of current within baseline→target (mandated by S-116). */
const krProgressFraction = (kr: StrataKeyResult): number | null => {
  if (kr.target == null || kr.current_value == null) return null;
  const base = kr.baseline ?? 0;
  const span = kr.target - base;
  if (span === 0) return null;
  return Math.max(0, Math.min(1, (kr.current_value - base) / span));
};

/** Lazy key-result fetch — mounts only when the OKR row is expanded (S-115/S-116). */
function KeyResultsList({ okrId }: { okrId: string }) {
  const q = useQuery({
    queryKey: ['strata', 'key-results', okrId],
    queryFn: () => kpiApi.keyResults(okrId),
    staleTime: STALE,
  });

  const columns = useMemo<Column<StrataKeyResult>[]>(() => [
    {
      id: 'name',
      label: 'Key result',
      flex: true,
      cell: ({ row }) => <span style={{ fontWeight: 600, color: T.text }}>{row.name}</span>,
    },
    {
      id: 'range',
      label: 'Baseline → target',
      width: 18,
      cell: ({ row }) => (
        <span style={{ color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
          {fmtUnit(row.baseline, row.unit)} → {fmtUnit(row.target, row.unit)}
        </span>
      ),
    },
    {
      id: 'current_value',
      label: 'Current',
      width: 12,
      cell: ({ row }) => (
        <span style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {fmtUnit(row.current_value, row.unit)}
        </span>
      ),
    },
    {
      id: 'progress',
      label: 'Progress',
      width: 16,
      cell: ({ row }) => {
        const frac = krProgressFraction(row);
        return frac == null
          ? <Dash />
          : <ProgressBar value={frac} aria-label={`Progress ${Math.round(frac * 100)}%`} />;
      },
    },
  ], []);

  if (q.isLoading) return <div style={{ padding: '8px 0' }}><Spinner size="small" aria-label="Loading key results" /></div>;
  if (q.isError) {
    return <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', margin: '8px 0' }}>Failed to load key results.</p>;
  }
  const krs = (q.data ?? []) as StrataKeyResult[];
  if (krs.length === 0) {
    return <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, margin: '8px 0' }}>No key results recorded.</p>;
  }
  return (
    <div style={{ marginTop: 8 }}>
      <JiraTable<StrataKeyResult>
        columns={columns}
        data={krs}
        getRowId={(row) => row.id}
        density="compact"
        showRowCount={false}
        rowsPerPage={100}
        ariaLabel="Key results"
      />
    </div>
  );
}

/** Accordion row — canonical chrome: chevron icon, hover bg, structured header (S-117). */
function OkrRow({ okr, objectiveName, isOpen, onToggle }: {
  okr: StrataOkr;
  objectiveName: string | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const status = OKR_STATUS_LOZENGE[okr.status];
  const confidenceText = okr.confidence != null
    ? `Confidence ${okr.confidence <= 1 ? fmtRatioPct(okr.confidence) : fmtPct(okr.confidence)}`
    : null;
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: hover ? T.sunken : 'none', border: 'none', padding: '12px 8px', cursor: 'pointer',
          font: 'inherit', textAlign: 'left', color: T.text, borderRadius: 4,
        }}
      >
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--ds-icon-subtle)', flexShrink: 0 }}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {okr.name}
        </span>
        {objectiveName ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
            Objective · {objectiveName}
          </span>
        ) : null}
        {confidenceText ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, minWidth: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {confidenceText}
          </span>
        ) : null}
        {status
          ? <Lozenge appearance={status.appearance}>{status.label}</Lozenge>
          : <Lozenge appearance="default">{labelize(okr.status)}</Lozenge>}
      </button>
      {isOpen ? (
        <div style={{ padding: '0 8px 12px 32px' }}>
          <KeyResultsList okrId={okr.id} />
        </div>
      ) : null}
    </div>
  );
}

function OkrPanel() {
  const { activeCycle } = useStrataContext();
  const okrsQ = useOkrs();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    <StrataPanel title="OKRs" icon={<Target size={16} />} count={okrs.length} testId="strata-okr-panel">
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
            />
          ))}
        </div>
      )}
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GovernedStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');

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
      flex: true,
      sortable: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <KpiNameLink row={row} onOpen={() => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }} />
      ),
    },
    {
      id: 'unit',
      label: 'Unit',
      width: 7,
      cell: ({ row }) => (row.unit ? <span style={{ color: T.subtle }}>{row.unit}</span> : <Dash />),
    },
    {
      id: 'direction',
      label: 'Direction',
      width: 13,
      cell: ({ row }) => (row.direction ? <DirectionCell direction={row.direction} /> : <Dash />),
    },
    {
      id: 'frequency',
      label: 'Frequency',
      width: 9,
      sortable: true,
      cell: ({ row }) => (row.frequency ? <span style={{ color: T.subtle }}>{labelize(row.frequency)}</span> : <Dash />),
    },
    {
      id: 'entry_method',
      label: 'Entry',
      width: 9,
      cell: ({ row }) => (row.entry_method ? <CatalystTag text={labelize(row.entry_method)} /> : <Dash />),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      sortable: true,
      cell: ({ row }) => <StrataGovernedStatusLozenge status={row.status} />,
    },
    {
      id: 'achievement',
      label: 'Achievement',
      width: 14,
      cell: ({ row }) => <KpiAchievementCell kpiId={row.id} />,
    },
    {
      id: 'validator',
      label: 'Validator',
      width: 12,
      cell: ({ row }) => <ValidatorCell validatorId={row.validator_id} profiles={profilesQ.data} />,
    },
    {
      id: 'data_source',
      label: 'Data source',
      width: 12,
      cell: ({ row }) =>
        row.data_source_id
          ? <span style={{ color: T.subtle }}>{dataSourceNameById.get(row.data_source_id) ?? '—'}</span>
          : <Dash />,
    },
  ], [navigate, dataSourceNameById, profilesQ.data]);

  const statusLabel = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';

  return (
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<Activity size={20} />}
        title="KPI / OKR Library"
        description="Governed KPI dictionary and OKR library"
        testId="strata-kpi-library-chrome"
      />

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
    </PageContainer>
  );
}
