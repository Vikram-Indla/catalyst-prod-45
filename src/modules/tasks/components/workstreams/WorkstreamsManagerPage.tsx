/**
 * WorkstreamsManagerPage — /tasks/workstreams (CAT-TASKS-20260627-001 Slice 5).
 *
 * Canonical Workstream CRUD surface, modelled on the Project-Manager page
 * (AllProjectsPage): CatalystPageHeader + search + the canonical JiraTable +
 * loading / empty / error states + ADS flag toasts. Replaces the deprecated
 * 404 route. Reads/writes task_workstreams ONLY, via the existing hooks.
 *
 * Components are canonical / ADS only — no hand-rolled table, modal, dropdown,
 * toast, or banned colours:
 *   - JiraTable                      (canonical list)
 *   - CatalystPageHeader             (canonical header)
 *   - @/components/ads Button / Textfield / DropdownMenu / Lozenge / Avatar
 *   - WorkstreamFormModal            (PortalFix + @atlaskit form — create/edit)
 *   - ConfirmDeleteDialog            (canonical destructive confirm)
 *   - flag / FlagsHost               (ADS @atlaskit/flag)
 */
import { useMemo, useState } from 'react';
import { Plus, Search, MoreHorizontal, FolderKanban } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { FlagsHost, flag } from '@/components/shared/JiraTable/flags';
import { Button, Textfield, DropdownMenu, Lozenge, Avatar } from '@/components/ads';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import {
  useTaskWorkstreams,
  useArchivedWorkstreamsCount,
  useArchiveWorkstream,
  useDeleteWorkstream,
  type Workstream,
} from '../../hooks/useTaskWorkstreams';
import { WorkstreamFormModal } from './WorkstreamFormModal';

function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color || token('color.text.subtlest'), display: 'inline-block', flexShrink: 0 }}
    />
  );
}

export default function WorkstreamsManagerPage() {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Workstream | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workstream | null>(null);

  const { data: workstreams = [], isLoading, error } = useTaskWorkstreams(showArchived);
  const { data: archivedCount = 0 } = useArchivedWorkstreamsCount();
  const archiveMut = useArchiveWorkstream();
  const deleteMut = useDeleteWorkstream();

  if (error) flag.error('Failed to load workstreams', (error as Error).message);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workstreams;
    return workstreams.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.key_prefix ?? '').toLowerCase().includes(q),
    );
  }, [workstreams, search]);

  const openCreate = () => { setFormMode('create'); setEditTarget(null); setFormOpen(true); };
  const openEdit = (w: Workstream) => { setFormMode('edit'); setEditTarget(w); setFormOpen(true); };
  const toggleArchive = (w: Workstream) => archiveMut.mutate({ id: w.id, archive: !w.is_archived });
  const confirmDelete = () => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); };

  const columns = useMemo<Column<Workstream>[]>(() => [
    {
      id: 'name', label: 'Name', flex: true, sortable: true, accessor: (r) => r.name,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100'), fontWeight: 500, color: token('color.text') }}>
          <ColorDot color={row.color} />
          {row.name}
        </span>
      ),
    },
    {
      id: 'code', label: 'Key', width: 12, accessor: (r) => r.key_prefix,
      cell: ({ row }) => (row.key_prefix ? <Lozenge>{row.key_prefix}</Lozenge> : <span style={{ color: token('color.text.subtlest') }}>—</span>),
    },
    {
      id: 'lead', label: 'Lead', width: 20, accessor: (r) => r.lead?.name ?? '',
      cell: ({ row }) => (row.lead
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100') }}><Avatar size="small" name={row.lead.name} /><span>{row.lead.name}</span></span>
        : <span style={{ color: token('color.text.subtlest') }}>Unassigned</span>),
    },
    {
      id: 'tasks', label: 'Tasks', width: 10, align: 'end', sortable: true, accessor: (r) => r.taskCount ?? 0,
      cell: ({ row }) => <span style={{ color: token('color.text.subtle') }}>{row.taskCount ?? 0}</span>,
    },
    {
      id: 'status', label: 'Status', width: 14, accessor: (r) => (r.is_archived ? 'Archived' : 'Active'),
      cell: ({ row }) => <Lozenge appearance={row.is_archived ? 'default' : 'success'}>{row.is_archived ? 'Archived' : 'Active'}</Lozenge>,
    },
    {
      id: 'actions', label: '', width: 6, align: 'end',
      cell: ({ row }) => (
        <DropdownMenu
          placement="bottom-end"
          aria-label={`Actions for ${row.name}`}
          trigger={({ isSelected }) => (
            <button
              type="button"
              aria-label="Workstream actions"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: isSelected ? token('color.background.neutral.subtle.pressed') : 'transparent',
                color: token('color.text.subtle'),
              }}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
          groups={[{
            items: [
              { label: 'Edit', onClick: () => openEdit(row) },
              { label: row.is_archived ? 'Restore' : 'Archive', onClick: () => toggleArchive(row) },
              { label: 'Delete', onClick: () => setDeleteTarget(row) },
            ],
          }]}
        />
      ),
    },
    // Cell handlers (openEdit / toggleArchive / setDeleteTarget) only close over
    // stable React setState + react-query mutate refs, so the schema is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const emptyView = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: token('space.600'), textAlign: 'center', gap: token('space.150') }}>
      <FolderKanban size={40} style={{ color: token('color.icon.subtle') }} strokeWidth={1.25} />
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: token('color.text') }}>
        {search ? 'No workstreams match your search' : 'No workstreams yet'}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: token('color.text.subtle'), maxWidth: 360 }}>
        {search ? 'Try a different name or key.' : 'Create a workstream to group and track related tasks.'}
      </p>
      {!search && <Button appearance="primary" iconBefore={<Plus size={16} />} onClick={openCreate}>Create workstream</Button>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: token('elevation.surface'), fontFamily: 'var(--cp-font-body)' }}>
      <CatalystPageHeader
        title="Workstreams"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150') }}>
            <Button
              appearance={showArchived ? 'primary' : 'subtle'}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Hide archived' : `Archived${archivedCount ? ` (${archivedCount})` : ''}`}
            </Button>
            <Button appearance="primary" iconBefore={<Plus size={16} />} onClick={openCreate}>Create workstream</Button>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', paddingInline: token('space.300'), paddingBlock: token('space.150') }}>
        <div style={{ marginBlockEnd: token('space.150'), maxWidth: 320 }}>
          <Textfield
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search workstreams…"
            aria-label="Search workstreams"
            elemBeforeInput={<span style={{ display: 'inline-flex', paddingInlineStart: token('space.075'), color: token('color.text.subtlest') }}><Search size={14} /></span>}
          />
        </div>

        <div style={{ border: `1px solid ${token('color.border')}`, borderRadius: 8, overflow: 'hidden', backgroundColor: token('elevation.surface') }}>
          <JiraTable<Workstream>
            columns={columns}
            data={filtered}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            emptyView={emptyView}
            density="comfortable"
            ariaLabel="Workstreams"
          />
        </div>
      </div>

      <WorkstreamFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        workstream={editTarget}
      />
      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        issueKey={deleteTarget?.key_prefix ?? ''}
        issueSummary={deleteTarget?.name}
        typeLabel="workstream"
        onConfirm={confirmDelete}
      />
      <FlagsHost />
    </div>
  );
}
