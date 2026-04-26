/**
 * IncidentListPage — migrated to canonical JiraTable on 2026-04-26.
 *
 * Before: bespoke 12-col CSS grid (`GRID_COLS = '36px 110px 1fr 64px ...'`)
 *         with inline-styled rows, hover effects, and pagination buttons —
 *         a custom re-implementation of what JiraTable already provides.
 *
 * After:  `<JiraTable>` from `@/components/shared/JiraTable` powers the
 *         body. Selection, sticky header, hover tint, row-click, sort,
 *         keyboard nav, column resize, column reorder, pagination, and
 *         empty state are all delegated to the canonical. Per-column
 *         renderers (severity/priority/status chips, avatar+name) are
 *         passed via the schema's `cell` factory so the visual treatment
 *         is preserved.
 *
 * The page header, stat cards, search input, status-filter chips, and
 * NewIncidentModal stay as page chrome above the table — exactly as
 * before. Only the rendering of the row list itself is canonical.
 *
 * NOCTURNE dark mode is honoured: header chrome uses the same
 * `useTheme()` palette helpers; JiraTable defers its own light/dark
 * styling to the canonical (see JiraTable.tsx focus-css block).
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIncidentListView, useIncidentStats } from '@/hooks/useIncidentHub';
import { useTheme } from '@/hooks/useTheme';
import { StatusLozenge } from './components/StatusLozenge';
import { SeverityChip } from './components/SeverityChip';
import { PriorityChip } from './components/PriorityChip';
import { NewIncidentModal } from './components/NewIncidentModal';

// Canonical table + cell factories.
import {
  JiraTable,
  makeKeyCell,
  makeAssigneeCell,
  makeDateCell,
  makeTypeIconCell,
} from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';

// Loose row type — the hook's return shape is the source of truth, but
// the table only reads the fields below. Keeping the alias `any`-ish
// avoids coupling this page to internal hook types.
type IncidentRow = ReturnType<typeof useIncidentListView>['data'] extends (infer U)[] | undefined ? U : never;

export default function IncidentListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: incidents, isLoading } = useIncidentListView();
  const stats = useIncidentStats();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!incidents) return [] as IncidentRow[];
    let list = [...incidents];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i: any) =>
        i.title?.toLowerCase().includes(q) ||
        i.incident_key?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((i: any) => i.status === statusFilter);
    }
    return list;
  }, [incidents, search, statusFilter]);

  const statusChips = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'triage', label: 'Triage' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'to_committee', label: 'Committee' },
    { key: 'resolved', label: 'Resolved' },
  ];

  // ── NOCTURNE color helpers (page chrome only — table palette is
  // owned by JiraTable's own focus-css block) ────────────────────────────
  const pageBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const surfaceBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)';
  const textPrimary = isDark ? '#EDEDED' : '#0F172A';
  const textSecondary = isDark ? '#A1A1A1' : '#64748B';
  const textMuted = isDark ? '#878787' : '#94A3B8';

  // ── Column schema (the canonical's value props per row) ─────────────────
  // The order here is the visual order. Widths are fractions out of 100;
  // the canonical scales to pixels against a nominal 1200px container.
  // Structural columns (selection, type icon) are pinned by the canonical
  // and do not participate in user-driven column reorder.
  const columns: Column<IncidentRow>[] = useMemo(() => [
    {
      id: '__type',
      label: '',
      width: 4,
      alwaysVisible: true,
      // Single-icon column for incidents — every row is the same icon
      // family. Use type_icon_url when the hook supplies one; fall back
      // to the same orange production-incident SVG used pre-migration.
      cell: makeTypeIconCell((row: any) => row.type_icon_url ? (
        <img src={row.type_icon_url} alt="" loading="lazy" style={{ width: 14, height: 14, flexShrink: 0 }} />
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="#FF5630" fillRule="evenodd" d="M4.78545267,10 L11.2145473,10 L10.5007848,8 L5.49921516,8 L4.78545267,10 Z M4,11 C3.44771525,11 3,11.4477153 3,12 L3,13 L13,13 L13,12 C13,11.4477153 12.5522847,11 12,11 L4,11 Z M5.8560964,7 L10.1439036,7 L8.94181993,3.63169838 C8.8409899,3.34916733 8.61864892,3.12682636 8.33611787,3.02599632 C7.81596508,2.84036355 7.24381284,3.1115456 7.05818007,3.63169838 L5.8560964,7 Z M2,0 L14,0 C15.1045695,-2.02906125e-16 16,0.8954305 16,2 L16,14 C16,15.1045695 15.1045695,16 14,16 L2,16 C0.8954305,16 1.3527075e-16,15.1045695 0,14 L0,2 C-1.3527075e-16,0.8954305 0.8954305,2.02906125e-16 2,0 Z"/>
        </svg>
      )),
    },
    {
      id: 'incident_key',
      label: 'Key',
      width: 8,
      sortable: true,
      defaultVisible: true,
      accessor: (r: any) => r.incident_key,
      cell: makeKeyCell((r: any) => r.incident_key),
    },
    {
      id: 'title',
      label: 'Title',
      width: 30,
      sortable: true,
      alwaysVisible: true,
      accessor: (r: any) => r.title,
      cell: ({ row }) => (
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            color: '#292A2E',
          }}
        >
          {(row as any).title || '—'}
        </span>
      ),
    },
    {
      id: 'severity',
      label: 'Sev',
      width: 6,
      sortable: true,
      accessor: (r: any) => r.severity,
      cell: ({ row }) => <SeverityChip severity={(row as any).severity || 'SEV4'} />,
    },
    {
      id: 'priority',
      label: 'Pri',
      width: 5,
      sortable: true,
      accessor: (r: any) => r.priority,
      cell: ({ row }) => <PriorityChip priority={(row as any).priority || 'P4'} />,
    },
    {
      id: 'status',
      label: 'Status',
      width: 8,
      sortable: true,
      accessor: (r: any) => r.status,
      cell: ({ row }) => <StatusLozenge status={(row as any).status || 'open'} />,
    },
    {
      id: 'project',
      label: 'Project',
      width: 8,
      sortable: true,
      accessor: (r: any) => r.project_name,
      cell: ({ row }) => (
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#505258',
          }}
        >
          {(row as any).project_name || '—'}
        </span>
      ),
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 10,
      sortable: true,
      defaultVisible: true,
      accessor: (r: any) => r.assignee_name,
      cell: makeAssigneeCell((r: any) => r.assignee_name ? { name: r.assignee_name } : null),
    },
    {
      id: 'reporter',
      label: 'Reporter',
      width: 10,
      sortable: true,
      defaultVisible: true,
      accessor: (r: any) => r.reporter_name,
      cell: makeAssigneeCell((r: any) => r.reporter_name ? { name: r.reporter_name } : null),
    },
    {
      id: 'updated_at',
      label: 'Updated',
      width: 6,
      sortable: true,
      accessor: (r: any) => r.updated_at,
      cell: makeDateCell((r: any) => r.updated_at),
    },
    {
      id: 'parent_key',
      label: 'Parent',
      width: 6,
      sortable: false,
      accessor: (r: any) => r.parent_key,
      cell: ({ row }) => {
        const k = (row as any).parent_key;
        if (!k) return <span style={{ color: '#7A869A' }}>—</span>;
        return (
          <span style={{ color: isDark ? '#93C5FD' : '#2563EB', fontSize: 13 }}>{k}</span>
        );
      },
    },
    {
      id: 'created_at',
      label: 'Reported',
      width: 6,
      sortable: true,
      accessor: (r: any) => r.created_at,
      cell: makeDateCell((r: any) => r.created_at),
    },
  ], [isDark]);

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: pageBg }}>
      {/* ── Page Header (unchanged) ────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEE2E2' }}>
              <AlertTriangle size={18} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, color: textPrimary }}>Incident List</h1>
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: textSecondary }}>
                Ministry of Industry &middot; {stats.active} open incidents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" style={{ borderRadius: 6 }}>
              <Download size={14} /> Export
            </Button>
            <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={() => setShowCreateModal(true)}>
              <Plus size={14} /> New Incident
            </Button>
          </div>
        </div>

        {/* Stat Cards (unchanged) */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Critical (SEV-1)', value: stats.sev1, accent: '#DC2626' },
            { label: 'High (SEV-2)', value: stats.sev2, accent: '#D97706' },
            { label: 'Active Incidents', value: stats.active, accent: isDark ? '#60A5FA' : '#2563EB' },
            { label: 'Committee Pending', value: stats.committeePending, accent: textSecondary },
            { label: 'Resolved (7d)', value: stats.resolvedWeek, accent: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="p-3" style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: 6 }}>
              <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: textSecondary, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 22, fontWeight: 700, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar (unchanged search/status chips) */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative" style={{ minWidth: 240 }}>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
            <Input
              placeholder="Search incidents, keys..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-xs"
              style={{ borderRadius: 4, fontFamily: 'var(--cp-font-body)' }}
            />
          </div>
          <div className="flex items-center gap-1">
            {statusChips.map(c => (
              <button
                key={c.key}
                onClick={() => { setStatusFilter(c.key); setPage(1); }}
                className="px-2.5 py-1 text-xs transition-colors"
                style={{
                  borderRadius: 4,
                  fontFamily: 'var(--cp-font-body)',
                  fontWeight: statusFilter === c.key ? 650 : 400,
                  backgroundColor: statusFilter === c.key ? (isDark ? 'rgba(37,99,235,0.16)' : '#EFF6FF') : 'transparent',
                  color: statusFilter === c.key ? (isDark ? '#93C5FD' : '#2563EB') : textSecondary,
                  border: statusFilter === c.key ? `1px solid ${isDark ? 'rgba(37,99,235,0.3)' : '#BFDBFE'}` : '1px solid transparent',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Canonical table ───────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <JiraTable<IncidentRow>
          columns={columns}
          data={filtered}
          getRowId={(r: any) => r.id}
          ariaLabel="Production incidents"
          isLoading={isLoading}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          rowsPerPage={25}
          page={page}
          onPageChange={setPage}
          onRowClick={(r: any) => navigate(`/incident-hub/view/${r.id}`)}
          enableColumnReorder
          emptyView={
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle size={32} style={{ color: textMuted }} />
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: textMuted, marginTop: 8 }}>
                {search ? 'No incidents match your search' : 'No incidents found. Create your first incident.'}
              </p>
              {!search && (
                <Button size="sm" className="mt-3" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} className="mr-1" /> Create Incident
                </Button>
              )}
            </div>
          }
        />
      </div>

      <NewIncidentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
