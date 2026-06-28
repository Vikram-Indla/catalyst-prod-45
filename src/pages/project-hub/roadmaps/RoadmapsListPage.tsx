/**
 * RoadmapsListPage — /project-hub/:key/roadmaps
 *
 * Mirrors FiltersListPage structure: same JiraTable props, same
 * CatalystListPageLayout wiring, same column patterns. Data from
 * filter_derived_views where type='roadmap'.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Button, { IconButton } from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import {
  CatalystListPageLayout,
  type QuickTab,
  type ToolbarFilter,
  type BulkAction,
} from '@/components/shared/CatalystListPage';
import { relativeFromIso } from '@/components/shared/RelativeTime';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Textfield from '@atlaskit/textfield';
import { Plus, Star, StarOff, MoreHorizontal } from '@/lib/atlaskit-icons';

// ── Row type ────────────────────────────────────────────────────────────────

interface RoadmapRow {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  visibility: 'private' | 'org';
  updated_at: string;
  source_filter_id: string;
  filter_name: string | null;
}

// ── Starred state (localStorage-backed, no DB column yet) ────────────────────

function useStarredRoadmaps(userId: string | null) {
  const KEY = `catalyst-starred-roadmaps-${userId ?? 'anon'}`;
  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = (id: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  return { starred, toggle };
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

interface RoadmapKebabMenuProps {
  row: RoadmapRow;
  currentUserId: string | null;
  projectKey: string | undefined;
  onDeleted: (id: string) => void;
}

function RoadmapKebabMenu({ row, currentUserId, projectKey, onDeleted }: RoadmapKebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isOwner = currentUserId && row.owner_id === currentUserId;

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === row.title) return;
    setRenaming(true);
    await (supabase as any)
      .from('filter_derived_views')
      .update({ title: renameValue.trim() })
      .eq('id', row.id);
    setRenaming(false);
    setRenameOpen(false);
    queryClient.invalidateQueries({ queryKey: ['roadmaps-list'] });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await (supabase as any)
      .from('filter_derived_views')
      .delete()
      .eq('id', row.id);
    setDeleting(false);
    if (!error) {
      setDeleteOpen(false);
      onDeleted(row.id);
    }
  };

  const menuItem = (label: string, onClick: () => void, danger = false) => (
    <div
      key={label}
      role="menuitem"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick(); }}
      onKeyDown={(e) => e.key === 'Enter' && (setOpen(false), onClick())}
      style={{
        padding: '6px 12px',
        fontSize: 'var(--ds-font-size-400)',
        cursor: 'pointer',
        color: danger ? 'var(--ds-text-danger, #AE2A19)' : token('color.text'),
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'))}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </div>
  );

  return (
    <>
      <IconButton
        ref={triggerRef}
        icon={MoreHorizontal}
        label="More actions"
        appearance="subtle"
        spacing="compact"
        onClick={openMenu}
      />

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: 160,
            background: token('color.background.overlay'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay'),
            zIndex: 9999,
            padding: '4px 0',
            border: `1px solid ${token('color.border')}`,
          }}
        >
          {menuItem('Open roadmap', () => navigate(`/project-hub/${projectKey}/roadmaps/${row.id}`))}
          {isOwner && menuItem('Rename', () => { setRenameValue(row.title); setRenameOpen(true); })}
          {isOwner && menuItem('Delete', () => setDeleteOpen(true), true)}
        </div>,
        document.body
      )}

      <ModalTransition>
        {deleteOpen && (
          <ModalDialog onClose={() => setDeleteOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle appearance="danger">Delete roadmap</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)' }}>
                Delete <strong>{row.title}</strong>? This cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button appearance="danger" isLoading={deleting} onClick={handleDelete}>Delete</Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      <ModalTransition>
        {renameOpen && (
          <ModalDialog onClose={() => setRenameOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Rename roadmap</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Textfield
                autoFocus
                value={renameValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRename(); }}
                placeholder="Roadmap name"
              />
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button
                appearance="primary"
                isDisabled={!renameValue.trim() || renameValue.trim() === row.title}
                isLoading={renaming}
                onClick={handleRename}
              >
                Rename
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </>
  );
}

// ── Data hook ────────────────────────────────────────────────────────────────

function useRoadmapsForProject(_projectKey: string | undefined) {
  return useQuery<RoadmapRow[]>({
    queryKey: ['roadmaps-list'],
    queryFn: async () => {
      const [{ data, error }, { data: filterRows, error: filterError }] = await Promise.all([
        (supabase as any)
          .from('filter_derived_views')
          .select('id, title, owner_id, visibility, updated_at, source_filter_id')
          .eq('type', 'roadmap')
          .order('updated_at', { ascending: false }),
        (supabase as any)
          .from('ph_saved_filters')
          .select('id, name'),
      ]);
      if (error) throw new Error(error.message);
      if (filterError) throw new Error(filterError.message);

      const rows: any[] = data ?? [];
      const ownerIds = [...new Set(rows.map((r: any) => r.owner_id).filter(Boolean))];

      let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ownerIds.length > 0) {
        const { data: profileRows } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds);
        profileMap = Object.fromEntries(
          (profileRows ?? []).map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        );
      }

      const filterNameMap: Record<string, string> = Object.fromEntries(
        (filterRows ?? []).map((f: any) => [f.id, f.name])
      );

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        owner_id: r.owner_id,
        owner_name: profileMap[r.owner_id]?.full_name ?? null,
        owner_avatar: profileMap[r.owner_id]?.avatar_url ?? null,
        visibility: r.visibility ?? 'private',
        updated_at: r.updated_at,
        source_filter_id: r.source_filter_id,
        filter_name: filterNameMap[r.source_filter_id] ?? null,
      }));
    },
    staleTime: 0,
  });
}

// ── Tab ids ──────────────────────────────────────────────────────────────────

type TabId = 'all' | 'mine' | 'starred';

const QUICK_TABS: QuickTab[] = [
  { id: 'all',     label: 'All roadmaps' },
  { id: 'mine',    label: 'My roadmaps' },
  { id: 'starred', label: 'Starred' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapsListPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<{ label: string; value: string } | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<{ label: string; value: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [columnVisibility, setColumnVisibility] = useState<Set<string>>(
    () => new Set(['name', 'owner', 'filter_name', 'visibility', 'updated'])
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  const { starred, toggle: toggleStar } = useStarredRoadmaps(currentUserId);
  const { data: allRoadmaps = [], isLoading } = useRoadmapsForProject(projectKey);

  // Remove deleted rows immediately (optimistic)
  const handleDeleted = (id: string) => {
    queryClient.setQueryData<RoadmapRow[]>(['roadmaps-list'], prev => (prev ?? []).filter(r => r.id !== id));
  };

  // ── Filtering ───────────────────────────────────────────────────────────
  const ownerOptions = useMemo(() => {
    const names = [...new Set(allRoadmaps.map(r => r.owner_name).filter(Boolean))].sort() as string[];
    return names.map(n => ({ label: n, value: n }));
  }, [allRoadmaps]);

  const filtered = useMemo(() => {
    let rows = allRoadmaps;
    if (activeTab === 'mine' && currentUserId) {
      rows = rows.filter(r => r.owner_id === currentUserId);
    }
    if (activeTab === 'starred') {
      rows = rows.filter(r => starred.has(r.id));
    }
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(r =>
      r.title.toLowerCase().includes(q) || (r.filter_name ?? '').toLowerCase().includes(q)
    );
    if (ownerFilter) rows = rows.filter(r => r.owner_name === ownerFilter.value);
    if (visibilityFilter) rows = rows.filter(r => r.visibility === visibilityFilter.value);

    const dir = sortOrder === 'ASC' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'owner') return (a.owner_name ?? '').localeCompare(b.owner_name ?? '') * dir;
      if (sortKey === 'updated') return (a.updated_at ?? '').localeCompare(b.updated_at ?? '') * dir;
      if (sortKey === 'visibility') return a.visibility.localeCompare(b.visibility) * dir;
      return a.title.localeCompare(b.title) * dir;
    });
  }, [allRoadmaps, activeTab, currentUserId, starred, search, ownerFilter, visibilityFilter, sortKey, sortOrder]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo((): Column<RoadmapRow>[] => [
    {
      id: 'star',
      label: '',
      width: 4,
      align: 'center' as const,
      alwaysVisible: true,
      cell: ({ row }) => {
        const isStarred = starred.has(row.id);
        return (
          <span onClick={e => e.stopPropagation()}>
            <IconButton
              icon={isStarred ? Star : StarOff}
              label={isStarred ? 'Unstar roadmap' : 'Star roadmap'}
              appearance="subtle"
              spacing="compact"
              onClick={() => toggleStar(row.id)}
            />
          </span>
        );
      },
    },
    {
      id: 'name',
      label: 'Name',
      width: 30,
      sortable: true,
      alwaysVisible: true,
      defaultVisible: true,
      accessor: r => r.title,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <Link
            to={`/project-hub/${projectKey}/roadmaps/${row.id}`}
            onClick={e => e.stopPropagation()}
            style={{
              color: token('color.link'),
              fontWeight: token('font.weight.medium'),
              fontSize: 'var(--ds-font-size-400)',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            {row.title}
          </Link>
          {row.filter_name && (
            <span style={{
              fontSize: 'var(--ds-font-size-200)',
              color: token('color.text.subtlest'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {row.filter_name}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      width: 13,
      sortable: true,
      defaultVisible: true,
      accessor: r => r.owner_name ?? '',
      cell: ({ row }) => row.owner_name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AkAvatar size="xsmall" src={row.owner_avatar ?? undefined} name={row.owner_name} />
          <span aria-hidden="true" style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text') }}>{row.owner_name}</span>
        </div>
      ) : (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtlest') }}>—</span>
      ),
    },
    {
      id: 'visibility',
      label: 'Visibility',
      width: 13,
      sortable: true,
      defaultVisible: true,
      accessor: r => r.visibility,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtle') }}>
          {row.visibility === 'org' ? 'My organization' : 'Private'}
        </span>
      ),
    },
    {
      id: 'updated',
      label: 'Last modified',
      width: 10,
      sortable: true,
      defaultVisible: true,
      accessor: r => r.updated_at ?? '',
      cell: ({ row }) => (
        <span
          style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtle') }}
          title={row.updated_at ? new Date(row.updated_at).toLocaleString() : undefined}
        >
          {relativeFromIso(row.updated_at)}
        </span>
      ),
    },
    {
      id: '__actions',
      label: '',
      width: 4,
      align: 'center' as const,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span onClick={e => e.stopPropagation()}>
          <RoadmapKebabMenu
            row={row}
            currentUserId={currentUserId}
            projectKey={projectKey}
            onDeleted={handleDeleted}
          />
        </span>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [currentUserId, projectKey, starred]);

  // ── Toolbar filters ──────────────────────────────────────────────────────
  const toolbarFilters: ToolbarFilter[] = [
    { id: 'owner', placeholder: 'Owner', options: ownerOptions, value: ownerFilter, onChange: v => setOwnerFilter(v) },
    {
      id: 'visibility',
      placeholder: 'Visibility',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'My organization', value: 'org' },
      ],
      value: visibilityFilter,
      onChange: v => setVisibilityFilter(v),
    },
  ];

  const hasActiveFilters = !!(search || ownerFilter || visibilityFilter);

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      isDanger: true,
      onClick: () => {
        if (!window.confirm(`Delete ${selectedIds.size} roadmap${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
        setSelectedIds(new Set());
      },
    },
  ];

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCsvAction = (
    <button
      onClick={() => {
        const rows = filtered.map(r => [
          `"${r.title.replace(/"/g, '""')}"`,
          `"${(r.owner_name ?? '').replace(/"/g, '""')}"`,
          `"${r.visibility}"`,
          `"${r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''}"`,
        ].join(','));
        const csv = ['Name,Owner,Visibility,Updated', ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'roadmaps.csv'; a.click();
        URL.revokeObjectURL(url);
      }}
      style={{
        background: 'none', border: 'none', padding: '0 4px',
        fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtle'), cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      Export CSV
    </button>
  );

  // ── Create CTA ───────────────────────────────────────────────────────────
  const createCta = (
    <Button
      appearance="primary"
      iconBefore={() => <Plus size="small" />}
      onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
    >
      Create roadmap
    </Button>
  );

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerText = !isLoading && allRoadmaps.length > 0
    ? (filtered.length === allRoadmaps.length
        ? `${allRoadmaps.length} roadmap${allRoadmaps.length !== 1 ? 's' : ''}`
        : `${filtered.length} of ${allRoadmaps.length} roadmap${allRoadmaps.length !== 1 ? 's' : ''}`)
    : undefined;

  // ── Empty state ──────────────────────────────────────────────────────────
  const emptyView = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 32px', gap: 12, color: token('color.text.subtle'),
    }}>
      <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: token('font.weight.medium') }}>
        {hasActiveFilters ? 'No roadmaps match your search' : 'No roadmaps yet'}
      </span>
      {!hasActiveFilters && (
        <>
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtlest') }}>
            Create a roadmap from any saved filter.
          </span>
          <Button appearance="primary" onClick={() => navigate(`/project-hub/${projectKey}/filters`)}>
            Go to filters
          </Button>
        </>
      )}
    </div>
  );

  return (
    <CatalystListPageLayout
      chromeBand={projectKey ? <ProjectPageHeader projectKey={projectKey} /> : undefined}
      tabs={QUICK_TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      tabBarActions={createCta}
      search={search}
      searchPlaceholder="Search roadmaps"
      onSearchChange={setSearch}
      toolbarFilters={toolbarFilters}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={() => { setSearch(''); setOwnerFilter(null); setVisibilityFilter(null); }}
      toolbarActions={exportCsvAction}
      selectedCount={selectedIds.size}
      bulkActions={bulkActions}
      onDeselect={() => setSelectedIds(new Set())}
      footer={footerText}
    >
      <JiraTable<RoadmapRow>
        columns={columns}
        data={filtered}
        getRowId={r => r.id}
        onRowClick={r => navigate(`/project-hub/${projectKey}/roadmaps/${r.id}`)}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
        isLoading={isLoading}
        selectable
        onSelectionChange={setSelectedIds}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        density="comfortable"
        ariaLabel="Roadmaps directory"
        showRowCount
        totalRowCount={allRoadmaps.length}
        emptyView={emptyView}
      />
    </CatalystListPageLayout>
  );
}
