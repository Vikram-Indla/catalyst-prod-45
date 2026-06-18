/**
 * Release Operations — Freeze Windows (route /release-hub/freeze-windows)
 *
 * Phase 13: JiraTable list of rh_freeze_windows with conflict detection (count
 * of active releases/changes scheduled inside each window, matching env), a
 * Create modal, and per-row delete. Conflict counts surface where a freeze is
 * being violated by scheduled work.
 */
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarOff, Plus, Trash2, AlertTriangle } from '@/lib/atlaskit-icons';
import { useFreezeWindowsList, useDeleteFreezeWindow, type FreezeWindowRow } from '@/hooks/useReleaseHub';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { CreateFreezeWindowModal } from '@/components/releasehub/CreateFreezeWindowModal';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  danger: 'var(--ds-text-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, #FFECEB)',
};

function titleCase(v: string | null) {
  if (!v) return '—';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

export default function FreezeWindowsPage() {
  const { data: windows = [], isLoading, error, refetch } = useFreezeWindowsList();
  const del = useDeleteFreezeWindow();
  const [showCreate, setShowCreate] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete freeze window "${name}"?`)) return;
    del.mutate(id, {
      onSuccess: () => catalystToast.success('Freeze window deleted'),
      onError: () => catalystToast.error('Failed to delete'),
    });
  };

  const columns: Column<FreezeWindowRow>[] = useMemo(() => [
    {
      id: 'name', label: 'Freeze window', flex: true, sortable: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 14, fontWeight: 600, color: T.text }}>{row.name}</span>
          {row.reason && <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.reason}</span>}
        </div>
      ),
    },
    { id: 'targetEnv', label: 'Env', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.targetEnv)}</span> },
    {
      id: 'window', label: 'Window', width: 22, sortable: true, accessor: (r) => r.startDate,
      cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{format(new Date(row.startDate), 'MMM d')} – {format(new Date(row.endDate), 'MMM d, yyyy')}</span>,
    },
    { id: 'status', label: 'Status', width: 12, cell: ({ row }) => <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle }}>{titleCase(row.status)}</span> },
    {
      id: 'conflicts', label: 'Conflicts', width: 12, align: 'end', accessor: (r) => r.conflicts,
      cell: ({ row }) => row.conflicts > 0 ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.danger, background: T.dangerBg, padding: '0 8px', borderRadius: 3 }}>
          <AlertTriangle size={12} style={{ color: T.danger }} /> {row.conflicts}
        </span>
      ) : <span style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>0</span>,
    },
    {
      id: '__del', label: '', width: 6, align: 'center',
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id, row.name); }} aria-label="Delete freeze window" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', color: T.subtlest, padding: 4 }}>
          <Trash2 size={14} style={{ color: T.subtlest }} />
        </button>
      ),
    },
  ], []);

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Freeze Windows</h1>
          <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Periods when deployments are blocked</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--ds-background-brand-bold, #0C66E4)', color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: RH.fontBody, fontSize: 14, fontWeight: 500 }}
        >
          <Plus size={14} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> New freeze window
        </button>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !isLoading && windows.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No freeze windows yet" subtitle="Freeze windows block deployments during sensitive periods like year-end or major events." actions={[{ label: '+ New freeze window', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : (
        <JiraTable<FreezeWindowRow>
          columns={columns}
          data={windows}
          getRowId={(r) => r.id}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          isLoading={isLoading}
          rowsPerPage={25}
          showRowCount
          totalRowCount={windows.length}
          ariaLabel="Freeze windows"
        />
      )}

      {showCreate && <CreateFreezeWindowModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
