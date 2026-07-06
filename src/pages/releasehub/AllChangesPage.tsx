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
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Search, Package } from '@/lib/atlaskit-icons';
import { useChangesList, type ChangeListRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { ChangeStatusLozenge, RiskLozenge, FlagLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { FacetFilterBar, type Facet } from '@/components/releasehub/FacetFilterBar';
import { useReleaseOpsPermissions, PERMISSION_DENIED_TOOLTIP } from '@/hooks/useReleaseOpsPermissions';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { AtlaskitPageShell } from '@/components/ads';

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

function RiskPill({ risk }: { risk: string | null }) {
  if (!risk) return <span style={{ color: T.subtlest }}>—</span>;
  const map: Record<string, { fg: string; bg: string }> = {
    low: { fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' },
    medium: { fg: 'var(--ds-text-warning)', bg: 'var(--ds-background-warning)' },
    high: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
    critical: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
  };
  const m = map[risk.toLowerCase()] ?? { fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{risk}</span>;
}

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function AllChangesPage() {
  const navigate = useNavigate();
  const { data: changes = [], isLoading, error, refetch } = useChangesList();
  const [search, setSearch] = useState('');
  const [facetValue, setFacetValue] = useState<Record<string, string[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createSource, setCreateSource] = useState<'catalyst' | 'external'>('catalyst');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const { canManage } = useReleaseOpsPermissions();
  const openCreate = (src: 'catalyst' | 'external') => { setCreateSource(src); setShowCreate(true); };

  // Artifact Change Records facets: Status · Type · Risk · Environment · Source.
  const facets: Facet[] = useMemo(() => {
    const distinct = (pick: (r: ChangeListRow) => string | null) => {
      const set = new Set<string>();
      changes.forEach((c) => { const v = pick(c); if (v) set.add(v); });
      return [...set].sort().map((v) => ({ id: v, label: titleCase(v) }));
    };
    return [
      { id: 'status', label: 'Status', options: distinct((c) => c.status) },
      { id: 'change_type', label: 'Type', options: distinct((c) => c.change_type) },
      { id: 'risk_level', label: 'Risk', options: distinct((c) => c.risk_level) },
      { id: 'target_env', label: 'Environment', options: distinct((c) => c.target_env) },
      { id: 'source', label: 'Source', options: distinct((c) => c.source) },
    ];
  }, [changes]);

  const filtered = useMemo(() => {
    const facetMatch = (c: ChangeListRow) =>
      Object.entries(facetValue).every(([fid, ids]) => {
        if (ids.length === 0) return true;
        const v = (c as any)[fid] as string | null;
        return v != null && ids.includes(v);
      });
    return changes.filter((c) => {
      if (!facetMatch(c)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${c.chg_number} ${c.title}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [changes, facetValue, search]);

  const handleFacetChange = (facetId: string, ids: string[]) =>
    setFacetValue((prev) => ({ ...prev, [facetId]: ids }));
  const clearFacets = () => setFacetValue({});

  const columns: Column<ChangeListRow>[] = useMemo(() => [
    {
      id: 'change', label: 'Change', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link }}>{row.chg_number}</span>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</span>
        </div>
      ),
    },
    {
      id: 'source', label: 'Source', width: 9,
      cell: ({ row }) => {
        const external = row.source === 'external';
        return (
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: external ? 'var(--ds-text-information)' : T.subtle, background: external ? 'var(--ds-background-information)' : T.sunken, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>
            {external ? 'External' : 'Catalyst'}
          </span>
        );
      },
    },
    { id: 'status', label: 'Status', width: 12, sortable: true, cell: ({ row }) => <ChangeStatusLozenge status={row.status} /> },
    { id: 'risk', label: 'Risk', width: 9, cell: ({ row }) => <RiskLozenge risk={row.risk_level} /> },
    {
      id: 'flags', label: 'Flags', width: 13,
      cell: ({ row }) => {
        const flags: string[] = [];
        if (row.isUnlinkedProduction) flags.push('Unlinked prod');
        if (row.isEmergency) flags.push('Emergency');
        if (row.status === 'failed' || row.status === 'blocked') flags.push(titleCase(row.status));
        if (flags.length === 0) return <span style={{ color: T.subtlest }}>—</span>;
        return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{flags.map((f) => <FlagLozenge key={f} label={f} />)}</div>;
      },
    },
    { id: 'change_type', label: 'Type', width: 9, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.change_type)}</span> },
    { id: 'target_env', label: 'Env', width: 9, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.target_env)}</span> },
    { id: 'deployment_category', label: 'Category', width: 11, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{titleCase(row.deployment_category)}</span> },
    {
      id: 'window', label: 'Planned', width: 11, sortable: true,
      accessor: (row) => row.planned_start_at ?? row.window_start ?? row.deployment_date,
      cell: ({ row }) => {
        const d = row.planned_start_at ?? row.window_start ?? row.deployment_date;
        return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{d ? format(new Date(d), row.planned_start_at ? 'MMM d, HH:mm' : 'MMM d, yyyy') : '—'}</span>;
      },
    },
    {
      id: 'release', label: 'Releases', width: 12,
      cell: ({ row }) => {
        if (row.releaseCount === 0) {
          return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: row.target_env === 'production' ? 'var(--ds-text-danger)' : T.subtlest, whiteSpace: 'nowrap' }}>{row.target_env === 'production' ? 'None (prod!)' : 'Unassigned'}</span>;
        }
        if (row.releaseCount === 1) {
          return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.releaseName ?? '1 release'}</span>;
        }
        return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text }}>{row.releaseCount} releases</span>;
      },
    },
    {
      id: 'sop', label: 'SOP', width: 8, align: 'end',
      cell: ({ row }) => row.sopProgress ? <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{row.sopProgress.done}/{row.sopProgress.total}</span> : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'appr', label: 'APPR', width: 8, align: 'end',
      cell: ({ row }) => row.apprProgress ? <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>{row.apprProgress.approved}/{row.apprProgress.total}</span> : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'manager', label: 'Manager', width: 11,
      cell: ({ row }) => row.manager ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CatalystAvatar name={row.manager.name} src={row.manager.avatarUrl ?? undefined} size="small" />
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.manager.name}</span>
        </div>
      ) : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'updated', label: 'Updated', width: 10, sortable: true,
      accessor: (row) => row.updated_at,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{row.updated_at ? `${formatDistanceToNowStrict(new Date(row.updated_at))} ago` : '—'}</span>,
    },
  ], []);

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" />} testId="release-ops-changes">
      <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => canManage && openCreate('external')}
            disabled={!canManage}
            title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP}
            style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
          >
            Map external change
          </button>
          <button
            onClick={() => canManage && openCreate('catalyst')}
            disabled={!canManage}
            title={canManage ? undefined : PERMISSION_DENIED_TOOLTIP}
            style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
          >
            <Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> New change
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <FacetFilterBar facets={facets} value={facetValue} onChange={handleFacetChange} onClear={clearFacets} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '48%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input
            type="text"
            placeholder="Search changes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 32, width: 240, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', outline: 'none' }}
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && changes.length === 0 ? (
        <EmptyState icon={Package} title="No change records yet" subtitle="A Change Record is the deployment vehicle in Release Ops — it captures what ships, to which environment, which release(s) it supports, who executes each stream, the SOP runbook, sign-offs, freeze checks, and the production event it generates." actions={[{ label: '+ New change', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState icon={Search} title="No changes match your filters" subtitle="Try adjusting your search or filters." actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); clearFacets(); }, variant: 'ghost' }]} />
      ) : (
        <JiraTable<ChangeListRow>
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/release-hub/changes/${(r as any).slug ?? r.id}`)}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={changes.length}
          ariaLabel="Change records"
        />
      )}

      {showCreate && <CreateChgModal onClose={() => setShowCreate(false)} initialSource={createSource} />}
      </div>
    </AtlaskitPageShell>
  );
}
