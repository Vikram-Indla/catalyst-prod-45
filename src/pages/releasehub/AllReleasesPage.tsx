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
import { Plus, LayoutGrid, List } from '@/lib/atlaskit-icons';
import { useReleasesList, useUpdateReleaseStatus, type ReleaseListRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { Package, Search } from '@/lib/atlaskit-icons';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildReleaseBoardAdapter } from '@/components/kanban/adapters/releaseBoardAdapter';
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
  { key: 'planning', label: 'Planning' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'released', label: 'Released' },
];

function mapStatus(status: string) {
  if (status === 'todo') return 'planning';
  if (status === 'done') return 'released';
  return status;
}

function HealthPill({ health }: { health: string | null }) {
  if (!health) return <span style={{ color: T.subtlest }}>—</span>;
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    at_risk: { label: 'At risk', fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
    on_track: { label: 'On track', fg: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FE)' },
    done: { label: 'Done', fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  };
  const m = map[health] ?? { label: health, fg: T.subtle, bg: T.sunken };
  return (
    <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{m.label}</span>
  );
}

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function AllReleasesPage() {
  const navigate = useNavigate();
  const { data: releases = [], isLoading, error, refetch } = useReleasesList();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'table' | 'board'>('table');
  const updateStatus = useUpdateReleaseStatus();

  const boardAdapter = useMemo(
    () => buildReleaseBoardAdapter({
      releases,
      search,
      onSearchChange: setSearch,
      onCardClick: (id) => navigate(`/release-hub/${id}`),
      onCreate: () => setShowCreate(true),
      onStatusChange: (id, status) => updateStatus.mutate({ id, status }),
    }),
    [releases, search, navigate, updateStatus],
  );

  const filtered = useMemo(() => {
    return releases.filter((r) => {
      if (statusFilter !== 'all' && mapStatus(r.status) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.name} ${r.version ?? ''} ${r.jira_key ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [releases, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: releases.length };
    STATUS_FILTERS.slice(1).forEach((s) => {
      c[s.key] = releases.filter((r) => mapStatus(r.status) === s.key).length;
    });
    return c;
  }, [releases]);

  const columns: Column<ReleaseListRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Release', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text }}>
            {row.name}{row.version ? <span style={{ color: T.subtlest, fontWeight: 400 }}> · {row.version}</span> : null}
          </span>
          {row.jira_key && (
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.subtlest }}>{row.jira_key}</span>
          )}
        </div>
      ),
    },
    {
      id: 'status', label: 'Status', width: 12, sortable: true,
      cell: ({ row }) => <StatusLozenge status={mapStatus(row.status)} />,
    },
    {
      id: 'health', label: 'Health', width: 10,
      cell: ({ row }) => <HealthPill health={row.health} />,
    },
    {
      id: 'target_env', label: 'Env', width: 10,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.target_env)}</span>,
    },
    {
      id: 'release_type', label: 'Type', width: 10,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.release_type)}</span>,
    },
    {
      id: 'target_date', label: 'Target', width: 10, sortable: true,
      accessor: (row) => row.planned_release_date ?? row.target_date,
      cell: ({ row }) => {
        const d = row.planned_release_date ?? row.target_date;
        return <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{d ? format(new Date(d), 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      id: 'changes', label: 'Changes', width: 8, align: 'end', sortable: true,
      accessor: (row) => row.changeCount,
      cell: ({ row }) => <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.text }}>{row.changeCount}</span>,
    },
    {
      id: 'updated', label: 'Updated', width: 10, sortable: true,
      accessor: (row) => row.updated_at,
      cell: ({ row }) => (
        <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>
          {row.updated_at ? `${formatDistanceToNowStrict(new Date(row.updated_at))} ago` : '—'}
        </span>
      ),
    },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Releases</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Plan, track, and ship releases</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setView('table')}
              aria-label="Table view"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', cursor: 'pointer', background: view === 'table' ? T.selectedBg : T.card, color: view === 'table' ? T.link : T.subtle }}
            >
              <List size={16} style={{ color: view === 'table' ? T.link : T.subtle }} />
            </button>
            <button
              onClick={() => setView('board')}
              aria-label="Board view"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', borderLeft: `1px solid ${T.border}`, cursor: 'pointer', background: view === 'board' ? T.selectedBg : T.card, color: view === 'board' ? T.link : T.subtle }}
            >
              <LayoutGrid size={16} style={{ color: view === 'board' ? T.link : T.subtle }} />
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}
          >
            <Plus size={14} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> New release
          </button>
        </div>
      </div>

      {/* Filter tabs + search (table view only; board has its own toolbar) */}
      {view === 'table' && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${active ? T.link : T.border}`,
                  background: active ? T.selectedBg : T.card,
                  color: active ? T.link : T.subtle,
                }}
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
            placeholder="Search releases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 32, width: 240, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 13, outline: 'none' }}
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
          actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); }, variant: 'ghost' }]}
        />
      ) : (
        <JiraTable<ReleaseListRow>
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/release-hub/${r.id}`)}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={releases.length}
          ariaLabel="Releases"
        />
      )}

      {showCreate && <CreateReleaseModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
