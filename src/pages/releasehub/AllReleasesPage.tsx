/**
 * Release Operations — Releases list (route /release-hub/releases)
 *
 * Rebuilt 2026-06-18 (Phase 4a) on the canonical JiraTable + ADS tokens
 * (was a hand-rolled <table> + cards + --cp-* tokens). Columns: Release,
 * Status, Health, Env, Type, Target, Changes, Updated. Search + status
 * filter + loading/empty/error states. Board view → Phase 6.
 *
 * Create Release modal is the existing CreateReleaseModal for now; an
 * ADS-clean rebuild with the richer fields (release_type, target_env,
 * managers, planned dates) lands in Phase 4b.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Plus } from '@/lib/atlaskit-icons';
import { useReleasesList, useUpdateReleaseStatus, type ReleaseListRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { Avatar } from '@/components/ads/Avatar';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { Package, Search } from '@/lib/atlaskit-icons';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildReleaseBoardAdapter } from '@/components/kanban/adapters/releaseBoardAdapter';
import { FacetFilterBar, type Facet } from '@/components/releasehub/FacetFilterBar';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)',
  card: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  selectedBg: 'var(--ds-background-selected)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function HealthPill({ health }: { health: string | null }) {
  if (!health) return <span style={{ color: T.subtlest }}>—</span>;
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    at_risk: { label: 'At risk', fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
    on_track: { label: 'On track', fg: 'var(--ds-text-information)', bg: 'var(--ds-background-information)' },
    done: { label: 'Done', fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' },
  };
  const m = map[health] ?? { label: health, fg: T.subtle, bg: T.sunken };
  return (
    <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{m.label}</span>
  );
}

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

/**
 * `variant` splits this page into two sidebar surfaces (artifact IA parity):
 *   - 'backlog'  → /release-hub/releases       (table only)
 *   - 'kanban'   → /release-hub/release-kanban  (board only)
 * The old in-page list/board toggle is removed; each view is now its own
 * dedicated nav item.
 */
export default function AllReleasesPage({ variant = 'backlog' }: { variant?: 'backlog' | 'kanban' }) {
  const navigate = useNavigate();
  const isKanban = variant === 'kanban';
  const { data: releases = [], isLoading, error, refetch } = useReleasesList();
  const [search, setSearch] = useState('');
  const [facetValue, setFacetValue] = useState<Record<string, string[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const view: 'table' | 'board' = isKanban ? 'board' : 'table';
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const updateStatus = useUpdateReleaseStatus();
  const { canManage } = useReleaseOpsPermissions();

  // Distinct-value facets derived from the loaded rows (artifact: Status ·
  // Health · Type · Environment dropdowns). Product facet lands with the
  // richer-columns pass (needs the product join).
  const facets: Facet[] = useMemo(() => {
    const distinct = (pick: (r: ReleaseListRow) => string | null) => {
      const set = new Set<string>();
      releases.forEach((r) => { const v = pick(r); if (v) set.add(v); });
      return [...set].sort().map((v) => ({ id: v, label: titleCase(v) }));
    };
    return [
      { id: 'productName', label: 'Product', options: distinct((r) => r.productName) },
      { id: 'status', label: 'Status', options: distinct((r) => r.status) },
      { id: 'health', label: 'Health', options: distinct((r) => r.health) },
      { id: 'release_type', label: 'Type', options: distinct((r) => r.release_type) },
      { id: 'target_env', label: 'Environment', options: distinct((r) => r.target_env) },
    ];
  }, [releases]);

  const boardAdapter = useMemo(
    () => buildReleaseBoardAdapter({
      releases,
      search,
      onSearchChange: setSearch,
      onCardClick: (id) => navigate(`/release-hub/${id}`),
      onCreate: () => setShowCreate(true),
      onStatusChange: (id, status) => updateStatus.mutateAsync({ id, status }),
    }),
    [releases, search, navigate, updateStatus],
  );

  const filtered = useMemo(() => {
    const facetMatch = (r: ReleaseListRow) =>
      Object.entries(facetValue).every(([fid, ids]) => {
        if (ids.length === 0) return true;
        const v = (r as any)[fid] as string | null;
        return v != null && ids.includes(v);
      });
    return releases.filter((r) => {
      if (!facetMatch(r)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.name} ${r.version ?? ''} ${r.jira_key ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [releases, facetValue, search]);

  const handleFacetChange = (facetId: string, ids: string[]) =>
    setFacetValue((prev) => ({ ...prev, [facetId]: ids }));
  const clearFacets = () => setFacetValue({});

  const columns: Column<ReleaseListRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Release', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>
            {row.name}{row.version ? <span style={{ color: T.subtlest, fontWeight: 400 }}> · {row.version}</span> : null}
          </span>
          {row.jira_key && (
            <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{row.jira_key}</span>
          )}
        </div>
      ),
    },
    {
      id: 'productName', label: 'Product', width: 10,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: row.productName ? T.text : T.subtlest }}>{row.productName ?? '—'}</span>,
    },
    {
      id: 'items', label: 'Items', width: 6, align: 'end', sortable: true,
      accessor: (row) => row.workItemsCount,
      cell: ({ row }) => <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: row.workItemsCount > 0 ? T.text : T.subtlest }}>{row.workItemsCount}</span>,
    },
    {
      id: 'target_env', label: 'Env', width: 10,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.target_env)}</span>,
    },
    {
      id: 'release_type', label: 'Type', width: 10,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.release_type)}</span>,
    },
    {
      id: 'status', label: 'Status', width: 12, sortable: true,
      cell: ({ row }) => <StatusLozenge status={row.status} />,
    },
    {
      id: 'health', label: 'Health', width: 10,
      cell: ({ row }) => <HealthPill health={row.health} />,
    },
    {
      id: 'readiness', label: 'Readiness', width: 11,
      accessor: (row) => row.readiness_pct ?? -1,
      cell: ({ row }) => {
        if (row.readiness_pct == null) return <span style={{ color: T.subtlest }}>—</span>;
        const pct = Math.max(0, Math.min(100, row.readiness_pct));
        const barColor = row.health === 'at_risk' ? 'var(--ds-background-danger-bold)' : 'var(--ds-background-brand-bold)';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--ds-background-neutral)', overflow: 'hidden', minWidth: 48 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
            </div>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
          </div>
        );
      },
    },
    {
      id: 'target_date', label: 'Planned', width: 10, sortable: true,
      accessor: (row) => row.planned_release_date ?? row.target_date,
      cell: ({ row }) => {
        const d = row.planned_release_date ?? row.target_date;
        return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{d ? format(new Date(d), 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      id: 'changes', label: 'Chg', width: 8, align: 'end', sortable: true,
      accessor: (row) => row.changeCount,
      cell: ({ row }) => <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>{row.changeCount}</span>,
    },
    {
      id: 'signoff', label: 'Sign-off', width: 9, align: 'end',
      cell: ({ row }) => row.signoffProgress
        ? <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', color: row.signoffProgress.approved === row.signoffProgress.total ? 'var(--ds-text-success)' : T.subtle }}>{row.signoffProgress.approved}/{row.signoffProgress.total}</span>
        : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'manager', label: 'Manager', width: 11,
      cell: ({ row }) => {
        if (!row.manager) return <span style={{ color: T.subtlest }}>—</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Avatar name={row.manager.name} src={row.manager.avatarUrl ?? undefined} size="small" />
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.manager.name}</span>
          </div>
        );
      },
    },
    {
      id: 'updated', label: 'Updated', width: 10, sortable: true,
      accessor: (row) => row.updated_at,
      cell: ({ row }) => (
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>
          {row.updated_at ? `${formatDistanceToNowStrict(new Date(row.updated_at))} ago` : '—'}
        </span>
      ),
    },
  ], []);

  return (
    <div style={{ background: T.surface, minHeight: '100%' }}>
      <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      <div style={{ padding: '8px 24px 24px' }}>
      {/* Create action (page title now lives in the canonical breadcrumb header) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => canManage && setShowCreate(true)}
          disabled={!canManage}
          title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> New release
        </button>
      </div>

      {/* Faceted filter row + search (table view only; board has its own toolbar) */}
      {view === 'table' && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <FacetFilterBar facets={facets} value={facetValue} onChange={handleFacetChange} onClear={clearFacets} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input
            type="text"
            placeholder="Search releases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 32, width: 240, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', outline: 'none' }}
          />
        </div>
      </div>
      )}

      {/* Content */}
      {view === 'board' ? (
        <div style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
          <KanbanBoardShell adapter={boardAdapter} title="Releases" hideTitleHeader />
        </div>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && releases.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No releases yet"
          subtitle="Releases group and track deployment changes across your products."
          actions={[{ label: '+ New release', onClick: () => setShowCreate(true), variant: 'primary' }]}
        />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No releases match your filters"
          subtitle="Try adjusting your search or status filter."
          actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); clearFacets(); }, variant: 'ghost' }]}
        />
      ) : (
        <JiraTable<ReleaseListRow>
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/release-hub/${r.id}`)}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={releases.length}
          ariaLabel="Releases"
        />
      )}

      {showCreate && <CreateReleaseModal onClose={() => setShowCreate(false)} />}
      </div>
    </div>
  );
}
