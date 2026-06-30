import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { MoreHorizontal } from '@/lib/atlaskit-icons';
import AkStarStarredIcon from '@atlaskit/icon/core/star-starred';
import AkStarUnstarredIcon from '@atlaskit/icon/core/star-unstarred';
import AkEditIcon from '@atlaskit/icon/core/edit';
import AkCopyIcon from '@atlaskit/icon/core/copy';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkLinkIcon from '@atlaskit/icon/core/link';
import AkPersonIcon from '@atlaskit/icon/core/person';
import AkBoardIcon from '@atlaskit/icon/core/board';
import AkTimelineIcon from '@atlaskit/icon/core/timeline';
import AkDashboardIcon from '@atlaskit/icon/core/dashboard';
import AkDeleteIcon from '@atlaskit/icon/core/delete';
import {
  useCopyFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  useStarFilter,
  useExistingBoardForFilter,
  useBoardsForProject,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
import { useCreateKanbanFromFilter } from '@/hooks/workhub/useCreateKanbanFromFilter';
import { ENABLE_FILTER_TO_KANBAN, ENABLE_FILTER_TO_ROADMAP, ENABLE_FILTER_TO_DASHBOARD, ENABLE_FILTER_WHATSAPP_AI_SUMMARY } from '@/lib/featureFlags';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useJqlResults } from '@/hooks/workhub/useJqlResults';
import { WhatsAppSummaryModal } from '@/features/whatsapp-summary/WhatsAppSummaryModal';
import {
  useExistingRoadmapForFilter,
  useCreateRoadmapFromFilter,
  useExistingDashboardForFilter,
  useCreateDashboardFromFilter,
} from '@/hooks/workhub/useFilterDerivedViews';
import { useParams, useNavigate } from 'react-router-dom';
import { catalystToast } from '@/lib/catalystToast';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { FilterSaveModal } from './FilterSaveModal';
import { FilterVersionHistory } from './FilterVersionHistory';
import { TransferOwnershipModal } from './TransferOwnershipModal';

interface FilterKebabMenuProps {
  filter: SavedFilterFull;
  currentUserId: string | null;
  /** JQL result rows — available when rendered inside FilterPreviewPage. */
  rows?: JqlResultRow[];
  /** True while JQL results are still loading — prevents "No items" false alarm. */
  isLoadingRows?: boolean;
  /** 'project' (default) or 'product' — controls nav prefix for Create Kanban/Roadmap/Dashboard. */
  hubType?: 'project' | 'product';
}

export function FilterKebabMenu({ filter, currentUserId, rows = [], isLoadingRows = false, hubType = 'project' }: FilterKebabMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardType, setBoardType] = useState<{ label: string; value: string }>({ label: 'Kanban', value: 'kanban' });
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [createKanbanOpen, setCreateKanbanOpen] = useState(false);
  const [kanbanName, setKanbanName] = useState('');
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [createRoadmapOpen, setCreateRoadmapOpen] = useState(false);
  const [roadmapName, setRoadmapName] = useState('');
  const [roadmapDateField, setRoadmapDateField] = useState<{ label: string; value: string }>({ label: 'Due date', value: 'due_date' });
  const [roadmapLaneBy, setRoadmapLaneBy] = useState<{ label: string; value: string }>({ label: 'Status', value: 'status' });
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [createDashboardOpen, setCreateDashboardOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { key: projectKey } = useParams<{ key: string }>();

  // Detect if the filter's JQL is scoped to a different project than the URL project.
  // Pattern: `project = FOO` or `project in (FOO, BAR)` — extract the first project key.
  const jqlProjectKey = (() => {
    const jql = filter.jql_query ?? '';
    const m = jql.match(/\bproject\s*=\s*["']?([A-Z][A-Z0-9_-]+)["']?/i)
           ?? jql.match(/\bproject\s+in\s*\(\s*["']?([A-Z][A-Z0-9_-]+)["']?/i);
    return m ? m[1].toUpperCase() : null;
  })();
  const filterProjectMismatch =
    jqlProjectKey !== null &&
    projectKey !== undefined &&
    jqlProjectKey !== projectKey.toUpperCase();

  const copyFilter      = useCopyFilter();
  const updateFilter    = useUpdateSavedFilter();
  const deleteFilter    = useDeleteSavedFilter();

  // Star state is authoritative from ph_saved_filters.starred_by_user_ids so
  // the kebab and the inline row star button always agree on the same value.
  const starFilter = useStarFilter();
  const hubPrefix = hubType === 'product' ? 'product-hub' : 'project-hub';
  const filterRoute = projectKey ? `/${hubPrefix}/${projectKey}/filters/${filter.id}` : undefined;
  const isStarred = currentUserId ? (filter.starred_by_user_ids ?? []).includes(currentUserId) : false;
  function handleToggleStar() {
    if (!currentUserId) return;
    starFilter.mutate({
      filterId: filter.id,
      currentStarredIds: filter.starred_by_user_ids ?? [],
      userId: currentUserId,
    });
  }
  const createKanban = useCreateKanbanFromFilter();
  const projectBoards = useBoardsForProject(ENABLE_FILTER_TO_KANBAN ? projectKey : undefined);
  const existingBoard = useExistingBoardForFilter(
    ENABLE_FILTER_TO_KANBAN ? filter.id : undefined,
    currentUserId,
  );
  const boards = existingBoard.data ? [existingBoard.data] : [];
  const createRoadmap  = useCreateRoadmapFromFilter();
  const existingRoadmap = useExistingRoadmapForFilter(
    ENABLE_FILTER_TO_ROADMAP ? filter.id : undefined,
    currentUserId,
  );
  const createDashboard  = useCreateDashboardFromFilter();
  const existingDashboard = useExistingDashboardForFilter(
    ENABLE_FILTER_TO_DASHBOARD ? filter.id : undefined,
    currentUserId,
  );
  // Self-fetch rows for WhatsApp modal when opened from the filter list (no rows prop).
  // Enabled only when the modal is open and no pre-loaded rows were provided.
  const selfFetch = useJqlResults(
    whatsAppOpen && rows.length === 0 ? (filter.jql_query ?? '') : '',
  );
  const modalRows = rows.length > 0 ? rows : (selfFetch.data?.items ?? []);
  const modalLoadingRows = rows.length === 0 ? (selfFetch.isLoading || selfFetch.isFetching) : isLoadingRows;

const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isPrivate = filter.viewers_config?.type === 'private';

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Estimate menu height (each item ~36px, dividers ~9px).
    // If not enough room below, open upward from the trigger top.
    const ESTIMATED_MENU_HEIGHT = 520;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < ESTIMATED_MENU_HEIGHT
      ? Math.max(8, rect.top - ESTIMATED_MENU_HEIGHT - 4)
      : rect.bottom + 4;
    setMenuPos({ top, left: rect.right });
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close on outside click or Escape — capture phase so modal Escape doesn't bleed
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) closeMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menuOpen, closeMenu]);

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };
    updateFilter.mutate({ id: filter.id, updates: next as any });
    closeMenu();
  }

  async function handleCreateKanban() {
    try {
      const boardId = await createKanban.mutateAsync({
        filter,
        projectKey: projectKey ?? null,
        sourceBoardId: projectBoards.data?.[0]?.id ?? null,
        name: kanbanName.trim(),
        // Filter boards have project_id=null, so 'project' visibility (which gates on
        // project_members join) would never resolve correctly. Use 'shared' instead —
        // can_view_board's filter-visibility clause handles actual access.
        visibility: isPrivate ? 'private' : 'shared',
      });
      setKanbanError(null);
      setCreateKanbanOpen(false);
      if (projectKey && boardId) navigate(`/${hubType === 'product' ? 'product-hub' : 'project-hub'}/${projectKey}/boards/${boardId}`);
    } catch (e: any) {
      console.error('Failed to create Kanban from filter:', e);
      setKanbanError(e?.message ?? 'Something went wrong creating the board.');
    }
  }

  async function handleCreateRoadmap() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const viewId = await createRoadmap.mutateAsync({
        filterId: filter.id,
        title: roadmapName.trim(),
        ownerId: user.id,
        config: {
          date_field: roadmapDateField.value as 'due_date' | 'created' | 'updated',
          lane_by: roadmapLaneBy.value as 'status' | 'assignee' | 'issueType' | 'projectKey',
        },
        visibility: isPrivate ? 'private' : 'org',
      });
      setRoadmapError(null);
      setCreateRoadmapOpen(false);
      if (projectKey && viewId) navigate(`/${hubType === 'product' ? 'product-hub' : 'project-hub'}/${projectKey}/roadmaps/${viewId}`);
    } catch (e: any) {
      console.error('Failed to create roadmap from filter:', e);
      setRoadmapError(e?.message ?? 'Something went wrong creating the roadmap.');
    }
  }

  async function handleCreateDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const viewId = await createDashboard.mutateAsync({
        filterId: filter.id,
        title: dashboardName.trim(),
        ownerId: user.id,
        visibility: isPrivate ? 'private' : 'org',
      });
      setDashboardError(null);
      setCreateDashboardOpen(false);
      if (projectKey && viewId) navigate(`/${hubType === 'product' ? 'product-hub' : 'project-hub'}/${projectKey}/dashboards/${viewId}`);
    } catch (e: any) {
      console.error('Failed to create dashboard from filter:', e);
      setDashboardError(e?.message ?? 'Something went wrong creating the dashboard.');
    }
  }

  function menuItem(label: React.ReactNode, onClick: () => void, disabled = false, icon?: React.ReactNode) {
    return (
      <button
        key={typeof label === 'string' ? label : undefined}
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (!disabled) { onClick(); closeMenu(); } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          fontSize: 'var(--ds-font-size-400)',
          color: disabled ? token('color.text.disabled', 'var(--ds-text-disabled)') : token('color.text', 'var(--ds-text)'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle)'); }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        {icon && (
          <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--ds-icon-subtle)' }}>
            {icon}
          </span>
        )}
        {label}
      </button>
    );
  }

  const divider = <div style={{ height: 1, background: token('color.border', 'var(--ds-border)'), margin: '4px 0' }} />;

  return (
    <>
      {/* Trigger — self-rolled because @atlaskit/dropdown-menu uses @atlaskit/popup which
          has the empty-portal/wrong-position bug inside JiraTable's overflow:hidden container */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Filter actions"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={openMenu}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          padding: 0,
          border: 'none',
          borderRadius: 3,
          background: 'transparent',
          color: token('color.icon.subtle', 'var(--ds-icon)'),
          cursor: 'pointer',
        }}
      >
        <MoreHorizontal size="small" />
      </button>

      {menuOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          data-filter-kebab-portal="true"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            transform: 'translateX(-100%)',
            background: token('elevation.surface.overlay', 'var(--ds-surface)'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            zIndex: 9999,
            minWidth: 180,
            padding: '4px 0',
          }}
        >
          {menuItem(
            isStarred ? 'Unstar filter' : 'Star filter',
            handleToggleStar,
            false,
            isStarred ? <AkStarStarredIcon label="" color="currentColor" /> : <AkStarUnstarredIcon label="" color="currentColor" />,
          )}
          {divider}
          {isOwner && menuItem('Edit filter', () => setEditOpen(true), false, <AkEditIcon label="" color="currentColor" />)}
          {menuItem('Copy filter', () => copyFilter.mutate(filter), false, <AkCopyIcon label="" color="currentColor" />)}
          {isOwner && menuItem('Rename', () => { setRenameValue(filter.name); setRenameOpen(true); }, false, <AkFilterIcon label="" color="currentColor" />)}
          {menuItem('Copy link', () => {
            const base = window.location.origin;
            const path = projectKey
              ? `/${hubPrefix}/${projectKey}/filters/create?filterId=${filter.id}`
              : `/product-hub/allwork?filterId=${filter.id}`;
            navigator.clipboard.writeText(base + path)
              .then(() => catalystToast.success('Link copied'))
              .catch(() => catalystToast.error('Could not copy link'));
          }, false, <AkLinkIcon label="" color="currentColor" />)}
          {isOwner && menuItem('Change owner', () => setTransferOpen(true), false, <AkPersonIcon label="" color="currentColor" />)}

          {ENABLE_FILTER_TO_KANBAN && (
            <>
              {divider}
              {(() => {
                // Use filter.used_by_board_ids[0] as primary signal — it's on the filter
                // object already (no async fetch). Fall back to existingBoard.data.id
                // (the dedup query) once it resolves.
                const linkedBoardId =
                  existingBoard.data?.id ??
                  (filter.used_by_board_ids?.length ? filter.used_by_board_ids[0] : null);
                return menuItem(
                  linkedBoardId ? 'Open Kanban board' : 'Create Kanban board',
                  () => {
                    if (linkedBoardId) {
                      if (projectKey) navigate(`/${hubType === 'product' ? 'product-hub' : 'project-hub'}/${projectKey}/boards/${linkedBoardId}`);
                      return;
                    }
                    setKanbanName(`${filter.name} board`);
                    setCreateKanbanOpen(true);
                  },
                  false,
                  <AkBoardIcon label="" color="currentColor" />,
                );
              })()}
            </>
          )}


          {!ENABLE_FILTER_TO_KANBAN && isOwner && (
            <>
              {divider}
              {menuItem('Create board from filter', () => { setBoardName(`${filter.name} board`); setCreateBoardOpen(true); }, false, <AkBoardIcon label="" color="currentColor" />)}
            </>
          )}

          {ENABLE_FILTER_WHATSAPP_AI_SUMMARY && (
            <>
              {divider}
              {menuItem('Send WhatsApp summary', () => setWhatsAppOpen(true), false,
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>,
              )}
            </>
          )}

          {isOwner && (
            <>
              {divider}
              {menuItem(
                <span style={{ color: 'var(--ds-text-danger)' }}>Delete</span>,
                () => setDeleteOpen(true),
                false,
                <span style={{ color: 'var(--ds-text-danger)' }}><AkDeleteIcon label="" color="currentColor" /></span>,
              )}
            </>
          )}
        </div>,
        document.body,
      )}

      {editOpen && (
        <FilterSaveModal
          filter={filter}
          onClose={() => setEditOpen(false)}
          onSaved={() => setEditOpen(false)}
        />
      )}

      {historyOpen && (
        <FilterVersionHistory
          filterId={filter.id}
          filterName={filter.name}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <ModalTransition>
        {renameOpen && (
          <ModalDialog onClose={() => setRenameOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Rename filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Textfield
                autoFocus
                value={renameValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && renameValue.trim() && renameValue.trim() !== filter.name) {
                    updateFilter.mutate({ id: filter.id, updates: { name: renameValue.trim() } as any });
                    setRenameOpen(false);
                  }
                }}
                placeholder="Filter name"
              />
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button
                appearance="primary"
                isDisabled={!renameValue.trim() || renameValue.trim() === filter.name}
                isLoading={updateFilter.isPending}
                onClick={() => {
                  updateFilter.mutate({ id: filter.id, updates: { name: renameValue.trim() } as any });
                  setRenameOpen(false);
                }}
              >
                Rename
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      <ModalTransition>
        {deleteOpen && (
          <ModalDialog onClose={() => setDeleteOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle appearance="danger">Delete filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: token('color.text') }}>
                Are you sure you want to delete{' '}
                <strong>{filter.name}</strong>? This action cannot be undone.
              </p>
              {filter.used_by_board_ids.length > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-300)', color: token('color.text.warning', 'var(--ds-text-warning)') }}>
                  This filter is used by {filter.used_by_board_ids.length} board{filter.used_by_board_ids.length > 1 ? 's' : ''}. Deleting it will unlink those boards.
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setDeleteOpen(false)} isDisabled={deleteFilter.isPending}>
                Cancel
              </Button>
              <Button
                appearance="danger"
                isLoading={deleteFilter.isPending}
                onClick={() => deleteFilter.mutate(filter.id, { onSuccess: () => setDeleteOpen(false) })}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      {transferOpen && (
        <TransferOwnershipModal
          filter={filter}
          onClose={() => setTransferOpen(false)}
        />
      )}

      <ModalTransition>
        {createBoardOpen && (
          <ModalDialog onClose={() => setCreateBoardOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Create board from filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Board name
                  </label>
                  <Textfield
                    autoFocus
                    value={boardName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBoardName(e.target.value)}
                    placeholder="e.g. Sprint board"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Board type
                  </label>
                  <Select
                    options={[
                      { label: 'Kanban', value: 'kanban' },
                      { label: 'Scrum', value: 'scrum' },
                    ]}
                    value={boardType}
                    onChange={(opt: any) => opt && setBoardType(opt)}
                    menuPosition="fixed"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
                  The board will use the JQL from <strong>{filter.name}</strong> to populate its issues.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setCreateBoardOpen(false)} isDisabled={creatingBoard}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!boardName.trim() || creatingBoard}
                isLoading={creatingBoard}
                onClick={async () => {
                  setCreatingBoard(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const { data: board, error } = await supabase
                      .from('boards')
                      .insert({
                        name: boardName.trim(),
                        board_type: boardType.value,
                        filter_id: filter.id,
                        jira_project_key: projectKey?.toUpperCase() ?? null,
                        created_by: user?.id ?? null,
                      })
                      .select('id')
                      .single();
                    if (error) throw error;
                    const nextBoardIds = [...filter.used_by_board_ids, board.id];
                    await supabase
                      .from('ph_saved_filters')
                      .update({ used_by_board_ids: nextBoardIds })
                      .eq('id', filter.id);
                    setCreateBoardOpen(false);
                    if (projectKey && board?.id) {
                      navigate(`/${hubType === 'product' ? 'product-hub' : 'project-hub'}/${projectKey}/boards/${board.id}`);
                    }
                  } catch (e: any) {
                    console.error('Failed to create board:', e);
                  } finally {
                    setCreatingBoard(false);
                  }
                }}
              >
                Create board
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      <ModalTransition>
        {createRoadmapOpen && (
          <ModalDialog onClose={() => setCreateRoadmapOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Create roadmap from filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Roadmap name
                  </label>
                  <Textfield
                    autoFocus
                    value={roadmapName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoadmapName(e.target.value)}
                    placeholder="e.g. Q3 delivery roadmap"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Date field
                  </label>
                  <Select
                    options={[
                      { label: 'Due date',     value: 'due_date' },
                      { label: 'Created date', value: 'created'  },
                      { label: 'Updated date', value: 'updated'  },
                    ]}
                    value={roadmapDateField}
                    onChange={(opt: any) => opt && setRoadmapDateField(opt)}
                    menuPosition="fixed"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Group lanes by
                  </label>
                  <Select
                    options={[
                      { label: 'Status',     value: 'status'     },
                      { label: 'Assignee',   value: 'assignee'   },
                      { label: 'Issue type', value: 'issueType'  },
                      { label: 'Project',    value: 'projectKey' },
                    ]}
                    value={roadmapLaneBy}
                    onChange={(opt: any) => opt && setRoadmapLaneBy(opt)}
                    menuPosition="fixed"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
                  Issues come live from <strong>{filter.name}</strong>. Items without a date go into an
                  Unscheduled group. Access follows the filter visibility.
                </p>
                {roadmapError && (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.danger', 'var(--ds-text-danger)') }}>
                    {roadmapError}
                  </p>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setCreateRoadmapOpen(false)} isDisabled={createRoadmap.isPending}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!roadmapName.trim() || createRoadmap.isPending}
                isLoading={createRoadmap.isPending}
                onClick={handleCreateRoadmap}
              >
                Create roadmap
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      <ModalTransition>
        {createDashboardOpen && (
          <ModalDialog onClose={() => setCreateDashboardOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Create dashboard from filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Dashboard name
                  </label>
                  <Textfield
                    autoFocus
                    value={dashboardName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDashboardName(e.target.value)}
                    placeholder="e.g. Q3 delivery dashboard"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
                  Metrics come live from <strong>{filter.name}</strong>. Access follows the filter visibility.
                </p>
                {dashboardError && (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.danger', 'var(--ds-text-danger)') }}>
                    {dashboardError}
                  </p>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setCreateDashboardOpen(false)} isDisabled={createDashboard.isPending}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!dashboardName.trim() || createDashboard.isPending}
                isLoading={createDashboard.isPending}
                onClick={handleCreateDashboard}
              >
                Create dashboard
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      {ENABLE_FILTER_WHATSAPP_AI_SUMMARY && (
        <WhatsAppSummaryModal
          isOpen={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          filterName={filter.name}
          filterJql={filter.jql_query ?? ''}
          projectKey={jqlProjectKey}
          rows={modalRows}
          isLoadingRows={modalLoadingRows}
        />
      )}

      <ModalTransition>
        {createKanbanOpen && (
          <ModalDialog onClose={() => setCreateKanbanOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Create Kanban from filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Board name
                  </label>
                  <Textfield
                    autoFocus
                    value={kanbanName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKanbanName(e.target.value)}
                    placeholder="e.g. Q2 delivery board"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
                  Cards come live from <strong>{filter.name}</strong>.{' '}
                  {(projectBoards.data?.length ?? 0) > 0
                    ? "Columns are inherited from this project's board."
                    : 'No existing board found — the board will start with default columns (To Do, In Progress, Done). You can customise them after creation.'
                  }{' '}
                  Access follows the filter &mdash; anyone who can see the filter can see this board.
                </p>
                {filterProjectMismatch && (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: token('color.text.warning', 'var(--ds-text-warning)'), background: token('color.background.warning', 'var(--ds-background-warning, var(--ds-background-warning))'), borderRadius: 4, padding: '8px 12px' }}>
                    This filter is scoped to project <strong>{jqlProjectKey}</strong> but you&rsquo;re
                    in <strong>{projectKey?.toUpperCase()}</strong>. The board will use{' '}
                    <strong>{projectKey?.toUpperCase()}</strong> columns — cards from{' '}
                    <strong>{jqlProjectKey}</strong> statuses may not map correctly.
                  </p>
                )}
                {kanbanError && (
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: token('color.text.danger', 'var(--ds-text-danger)') }}>
                    {kanbanError}
                  </p>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setCreateKanbanOpen(false)} isDisabled={createKanban.isPending}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!kanbanName.trim() || createKanban.isPending}
                isLoading={createKanban.isPending}
                onClick={handleCreateKanban}
              >
                Create Kanban
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </>
  );
}
