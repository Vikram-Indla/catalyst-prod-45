/**
 * Release Operations — Change Records list (route /release-hub/changes)
 *
 * Rebuilt 2026-06-18 (Phase 7a) on the canonical JiraTable + ADS tokens
 * (mirrors the Releases list). Columns: Change, Status, Risk, Type, Env,
 * Category, Window, Release, Updated. Search + status filter + states.
 * Rows are not yet clickable — change detail arrives in Phase 8. Create/Map
 * Change modal is the existing CreateChgModal for now; an ADS-clean rebuild
 * with Approvers + Notify fields lands in Phase 7b.
 */
import React, { useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Search, Package } from '@/lib/atlaskit-icons';
import { useChangesList, type ChangeListRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { RH } from '@/constants/releasehub.design';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  link: 'var(--ds-link, #0C66E4)',
  selectedBg: 'var(--ds-background-selected, #E9F2FE)',
  mono: 'var(--ds-font-family-code, monospace)',
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_uat', label: 'In UAT' },
  { key: 'in_beta', label: 'In Beta' },
  { key: 'in_production', label: 'In Production' },
];

function RiskPill({ risk }: { risk: string | null }) {
  if (!risk) return <span style={{ color: T.subtlest }}>—</span>;
  const map: Record<string, { fg: string; bg: string }> = {
    low: { fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
    medium: { fg: 'var(--ds-text-warning, #A54800)', bg: 'var(--ds-background-warning, #FFF7D6)' },
    high: { fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
    critical: { fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
  };
  const m = map[risk.toLowerCase()] ?? { fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{risk}</span>;
}

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function AllChangesPage() {
  const { data: changes = [], isLoading, error, refetch } = useChangesList();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => changes.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.chg_number} ${c.title}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [changes, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: changes.length };
    STATUS_FILTERS.slice(1).forEach((s) => { c[s.key] = changes.filter((x) => x.status === s.key).length; });
    return c;
  }, [changes]);

  const columns: Column<ChangeListRow>[] = useMemo(() => [
    {
      id: 'change', label: 'Change', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.link }}>{row.chg_number}</span>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</span>
        </div>
      ),
    },
    { id: 'status', label: 'Status', width: 12, sortable: true, cell: ({ row }) => <StatusLozenge status={row.status} /> },
    { id: 'risk', label: 'Risk', width: 9, cell: ({ row }) => <RiskPill risk={row.risk_level} /> },
    { id: 'change_type', label: 'Type', width: 9, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.change_type)}</span> },
    { id: 'target_env', label: 'Env', width: 9, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.target_env)}</span> },
    { id: 'deployment_category', label: 'Category', width: 11, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.deployment_category)}</span> },
    {
      id: 'window', label: 'Window', width: 10, sortable: true,
      accessor: (row) => row.window_start ?? row.deployment_date,
      cell: ({ row }) => {
        const d = row.window_start ?? row.deployment_date;
        return <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{d ? format(new Date(d), 'MMM d, yyyy') : '—'}</span>;
      },
    },
    { id: 'release', label: 'Release', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: row.releaseName ? T.text : T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.releaseName ?? 'Unassigned'}</span> },
    {
      id: 'updated', label: 'Updated', width: 10, sortable: true,
      accessor: (row) => row.updated_at,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>{row.updated_at ? `${formatDistanceToNowStrict(new Date(row.updated_at))} ago` : '—'}</span>,
    },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Change Records</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Track and govern deployment changes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> New change
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, border: `1px solid ${active ? T.link : T.border}`, background: active ? T.selectedBg : T.card, color: active ? T.link : T.subtle }}
              >
                {s.label}
                <span style={{ fontSize: 11, fontWeight: 700, color: T.subtlest }}>{counts[s.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input
            type="text"
            placeholder="Search changes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 32, width: 240, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && changes.length === 0 ? (
        <EmptyState icon={Package} title="No change records yet" subtitle="Changes capture what ships, how, and who approves it." actions={[{ label: '+ New change', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState icon={Search} title="No changes match your filters" subtitle="Try adjusting your search or status filter." actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); }, variant: 'ghost' }]} />
      ) : (
        <JiraTable<ChangeListRow>
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={changes.length}
          ariaLabel="Change records"
        />
      )}

      {showCreate && <CreateChgModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
