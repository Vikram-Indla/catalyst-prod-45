/**
 * STRATA KPI/OKR Library — /strata/kpis (CAT-STRATA-20260705-001).
 * Governed KPI dictionary (canonical JiraTable) + OKR panel with lazy key results.
 * UI never computes achievement/RAG — per-row values come from
 * strata_calc_kpi_achievement via useKpiAchievement. Unknowns render '—'.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { EmptyState, Lozenge, SectionMessage, Spinner, Textfield } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable/types';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import {
  useDataSources, useKpiAchievement, useKpis, useOkrs, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { StrataBandLozenge, StrataConfigContextBar, StrataPanel } from '@/modules/strata/components/shared';
import type { GovernedStatus, StrataKeyResult, StrataKpi, StrataOkr } from '@/modules/strata/types';

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
  if (!status) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
  const cfg = GOVERNED_LOZENGE[status as GovernedStatus];
  if (!cfg) return <Lozenge appearance="default">{String(status).replace(/_/g, ' ')}</Lozenge>;
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
  band: 'Band',
  manual: 'Manual',
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4,
        background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

const Dash = () => <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;

/** Per-row achievement — server-computed via strata_calc_kpi_achievement. */
function KpiAchievementCell({ kpiId }: { kpiId: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiAchievement(kpiId, activePeriod?.id);
  if (!activePeriod) return <Dash />;
  if (q.isLoading) return <Spinner size="small" aria-label="Loading achievement" />;
  const a = (q.data ?? null) as KpiAchievementPayload | null;
  if (q.isError || !a || a.achievement == null) return <Dash />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{a.achievement}%</span>
      {a.status_key ? <StrataBandLozenge bandKey={a.status_key} /> : null}
    </span>
  );
}

// ── OKR panel ────────────────────────────────────────────────────────────────
const OKR_STATUS_LOZENGE: Record<StrataOkr['status'], { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  draft: { label: 'Draft', appearance: 'default' },
  active: { label: 'Active', appearance: 'inprogress' },
  closed: { label: 'Closed', appearance: 'default' },
};

/** Lazy key-result fetch — mounts only when the OKR row is expanded. */
function KeyResultsList({ okrId }: { okrId: string }) {
  const q = useQuery({
    queryKey: ['strata', 'key-results', okrId],
    queryFn: () => kpiApi.keyResults(okrId),
    staleTime: STALE,
  });
  if (q.isLoading) return <div style={{ padding: '8px 0' }}><Spinner size="small" aria-label="Loading key results" /></div>;
  if (q.isError) {
    return <p style={{ fontSize: 12, color: 'var(--ds-text-danger)', margin: '8px 0' }}>Failed to load key results.</p>;
  }
  const krs = (q.data ?? []) as StrataKeyResult[];
  if (krs.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--ds-text-subtle)', margin: '8px 0' }}>No key results recorded.</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
      <thead>
        <tr>
          {['Key result', 'Baseline → target', 'Current', 'Unit'].map((h) => (
            <th
              key={h}
              style={{
                textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)',
                padding: '4px 8px', borderBottom: '1px solid var(--ds-border)',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {krs.map((kr) => (
          <tr key={kr.id}>
            <td style={{ fontSize: 13, color: 'var(--ds-text)', padding: '8px 8px', borderBottom: '1px solid var(--ds-border)' }}>{kr.name}</td>
            <td style={{ fontSize: 13, color: 'var(--ds-text)', padding: '8px 8px', borderBottom: '1px solid var(--ds-border)' }}>
              {kr.baseline != null ? kr.baseline : '—'} → {kr.target != null ? kr.target : '—'}
            </td>
            <td style={{ fontSize: 13, color: 'var(--ds-text)', padding: '8px 8px', borderBottom: '1px solid var(--ds-border)' }}>
              {kr.current_value != null ? kr.current_value : '—'}
            </td>
            <td style={{ fontSize: 13, color: 'var(--ds-text-subtle)', padding: '8px 8px', borderBottom: '1px solid var(--ds-border)' }}>{kr.unit ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

  return (
    <StrataPanel title="OKRs" testId="strata-okr-panel">
      {okrsQ.isLoading ? (
        <Spinner size="medium" aria-label="Loading OKRs" />
      ) : okrsQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load OKRs">
          <p>{(okrsQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : (okrsQ.data ?? []).length === 0 ? (
        <EmptyState size="compact" header="No OKRs yet" description="OKRs linked to strategy objectives will appear here." />
      ) : (
        <div>
          {(okrsQ.data ?? []).map((okr) => {
            const isOpen = expanded.has(okr.id);
            const status = OKR_STATUS_LOZENGE[okr.status];
            return (
              <div key={okr.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <button
                  type="button"
                  onClick={() => toggle(okr.id)}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
                    font: 'inherit', textAlign: 'left', color: 'var(--ds-text)',
                  }}
                >
                  {isOpen
                    ? <ChevronDownIcon size="small" label="" />
                    : <ChevronRightIcon size="small" label="" />}
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}>{okr.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                    {okr.objective_element_id
                      ? (elementNameById.get(okr.objective_element_id) ?? '—')
                      : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)', minWidth: 80, textAlign: 'right' }}>
                    {okr.confidence != null ? `${okr.confidence}%` : '—'}
                  </span>
                  {status
                    ? <Lozenge appearance={status.appearance}>{status.label}</Lozenge>
                    : <Lozenge appearance="default">{okr.status}</Lozenge>}
                </button>
                {isOpen ? (
                  <div style={{ padding: '0 4px 12px 24px' }}>
                    <KeyResultsList okrId={okr.id} />
                  </div>
                ) : null}
              </div>
            );
          })}
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
    rows = [...rows].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? '');
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? '');
      return av.localeCompare(bv) * dir;
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (row.slug) navigate(Routes.strata.kpi(row.slug)); }}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: row.slug ? 'pointer' : 'default',
            font: 'inherit', fontWeight: 600, color: 'var(--ds-text)', textAlign: 'left',
          }}
        >
          {row.name}
        </button>
      ),
    },
    {
      id: 'unit',
      label: 'Unit',
      width: 8,
      cell: ({ row }) => (row.unit ? <span style={{ color: 'var(--ds-text-subtle)' }}>{row.unit}</span> : <Dash />),
    },
    {
      id: 'direction',
      label: 'Direction',
      width: 12,
      cell: ({ row }) => (row.direction ? <Chip>{DIRECTION_LABEL[row.direction] ?? row.direction}</Chip> : <Dash />),
    },
    {
      id: 'frequency',
      label: 'Frequency',
      width: 9,
      sortable: true,
      cell: ({ row }) => (row.frequency ? <span style={{ color: 'var(--ds-text-subtle)', textTransform: 'capitalize' }}>{row.frequency}</span> : <Dash />),
    },
    {
      id: 'entry_method',
      label: 'Entry',
      width: 9,
      cell: ({ row }) => (row.entry_method ? <Chip>{row.entry_method}</Chip> : <Dash />),
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
      width: 8,
      cell: ({ row }) => (row.validator_id ? <span style={{ color: 'var(--ds-text-subtle)' }}>Set</span> : <Dash />),
    },
    {
      id: 'data_source',
      label: 'Data source',
      width: 12,
      cell: ({ row }) =>
        row.data_source_id
          ? <span style={{ color: 'var(--ds-text-subtle)' }}>{dataSourceNameById.get(row.data_source_id) ?? '—'}</span>
          : <Dash />,
    },
  ], [navigate, dataSourceNameById]);

  const statusLabel = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>KPI / OKR Library</h1>
      <StrataConfigContextBar />

      {kpisQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load KPI library">
          <p>{(kpisQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel
            title="KPI dictionary"
            testId="strata-kpi-library-panel"
            actions={
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
                {filtered.length} KPIs · governed dictionary
              </span>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 260 }}>
                <Textfield
                  spacing="compact"
                  placeholder="Search KPIs by name"
                  value={search}
                  onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                  aria-label="Search KPIs by name"
                />
              </div>
              <DropdownMenu
                trigger={({ triggerRef, ...props }) => (
                  <Button {...props} ref={triggerRef} appearance="default" iconAfter={ChevronDownIcon}>
                    {statusLabel}
                  </Button>
                )}
              >
                <DropdownItemGroup>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <DropdownItem key={o.value} isSelected={o.value === statusFilter} onClick={() => setStatusFilter(o.value)}>
                      {o.label}
                    </DropdownItem>
                  ))}
                </DropdownItemGroup>
              </DropdownMenu>
            </div>

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
