import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { MoreHorizontal } from '@/lib/atlaskit-icons';
import {
  useCopyFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  useBoardsForProject,
  useToggleFilterBoardLink,
  useToggleFilterSubscription,
  useExistingBoardForFilter,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
import { useCreateKanbanFromFilter } from '@/hooks/workhub/useCreateKanbanFromFilter';
import { ENABLE_FILTER_TO_KANBAN, ENABLE_FILTER_TO_ROADMAP } from '@/lib/featureFlags';
import {
  useExistingRoadmapForFilter,
  useCreateRoadmapFromFilter,
} from '@/hooks/workhub/useFilterDerivedViews';
import { useParams, useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { FilterSaveModal } from './FilterSaveModal';
import { FilterVersionHistory } from './FilterVersionHistory';
import { TransferOwnershipModal } from './TransferOwnershipModal';

interface FilterKebabMenuProps {
  filter: SavedFilterFull;
  currentUserId: string | null;
}

export function FilterKebabMenu({ filter, currentUserId }: FilterKebabMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [editOpen, setEditOpen] = useState(false);
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
  const boardLink       = useToggleFilterBoardLink();
  const subscribeFilter = useToggleFilterSubscription();
  const { data: boards = [] } = useBoardsForProject(projectKey);

  const createKanban = useCreateKanbanFromFilter();
  const existingBoard = useExistingBoardForFilter(
    ENABLE_FILTER_TO_KANBAN ? filter.id : undefined,
    currentUserId,
  );
  const createRoadmap  = useCreateRoadmapFromFilter();
  const existingRoadmap = useExistingRoadmapForFilter(
    ENABLE_FILTER_TO_ROADMAP ? filter.id : undefined,
    currentUserId,
  );
const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isSubscribed = currentUserId ? (filter.subscriber_ids ?? []).includes(currentUserId) : false;
  const isPrivate = filter.viewers_config?.type === 'private';

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.right });
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
        sourceBoardId: boards[0]?.id ?? null,
        name: kanbanName.trim(),
        // Filter boards have project_id=null, so 'project' visibility (which gates on
        // project_members join) would never resolve correctly. Use 'shared' instead —
        // can_view_board's filter-visibility clause handles actual access.
        visibility: isPrivate ? 'private' : 'shared',
      });
      setKanbanError(null);
      setCreateKanbanOpen(false);
      if (projectKey && boardId) navigate(`/project-hub/${projectKey}/boards/${boardId}`);
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
      if (projectKey && viewId) navigate(`/project-hub/${projectKey}/roadmaps/${viewId}`);
    } catch (e: any) {
      console.error('Failed to create roadmap from filter:', e);
      setRoadmapError(e?.message ?? 'Something went wrong creating the roadmap.');
    }
  }

  function menuItem(label: React.ReactNode, onClick: () => void, disabled = false) {
    return (
      <button
        key={typeof label === 'string' ? label : undefined}
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (!disabled) { onClick(); closeMenu(); } }}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          fontSize: 14,
          color: disabled ? token('color.text.disabled', '#8993A4') : token('color.text', '#172B4D'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        {label}
      </button>
    );
  }

  const divider = <div style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '4px 0' }} />;

  return (
    <>
      {/* Trigger — self-rolled because @atlaskit/dropdown-menu uses @atlaskit/popup which
          has the empty-portal/wrong-position bug inside JiraTable's overflow:hidden container */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Filter actions"
        aria-expanded={menuOpen}
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
          color: token('color.icon.subtle', '#44546F'),
          cursor: 'pointer',
        }}
      >
        <MoreHorizontal size="small" />
      </button>

      {menuOpen && createPortal(
        <div
          ref={menuRef}
          data-filter-kebab-portal="true"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            transform: 'translateX(-100%)',
            background: token('elevation.surface.overlay', '#FFFFFF'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9,30,66,0.25)'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            zIndex: 9999,
            minWidth: 180,
            padding: '4px 0',
          }}
        >
          {isOwner && menuItem('Edit filter', () => setEditOpen(true))}
          {menuItem('Copy filter', () => copyFilter.mutate(filter))}
          {menuItem('Copy link', () => {
            const base = window.location.origin;
            const path = projectKey
              ? `/project-hub/${projectKey}/filters/${filter.id}`
              : `/product-hub/filters/${filter.id}`;
            navigator.clipboard.writeText(base + path).catch(() => {});
          })}
          {menuItem(
            isSubscribed ? 'Unsubscribe' : 'Subscribe',
            () => subscribeFilter.mutate({ filterId: filter.id, currentSubscriberIds: filter.subscriber_ids ?? [], userId: currentUserId ?? '' }),
            !currentUserId,
          )}
          {isOwner && menuItem(isPrivate ? 'Share with organisation' : 'Make private', handleToggleVisibility)}
          {menuItem('View version history', () => setHistoryOpen(true))}
          {isOwner && menuItem('Change owner', () => setTransferOpen(true))}

          {ENABLE_FILTER_TO_KANBAN && (
            <>
              {divider}
              {menuItem(
                existingBoard.data ? 'Open Kanban' : 'Create Kanban from filter',
                () => {
                  if (existingBoard.data) {
                    if (projectKey) navigate(`/project-hub/${projectKey}/boards/${existingBoard.data.id}`);
                    return;
                  }
                  setKanbanName(`${filter.name} board`);
                  setCreateKanbanOpen(true);
                },
              )}
            </>
          )}

          {ENABLE_FILTER_TO_ROADMAP && (
            <>
              {divider}
              {menuItem(
                existingRoadmap.data ? 'Open roadmap' : 'Create roadmap from filter',
                () => {
                  if (existingRoadmap.data) {
                    if (projectKey) navigate(`/project-hub/${projectKey}/roadmaps/${existingRoadmap.data.id}`);
                    return;
                  }
                  setRoadmapName(`${filter.name} roadmap`);
                  setCreateRoadmapOpen(true);
                },
              )}
            </>
          )}

          {!ENABLE_FILTER_TO_KANBAN && isOwner && (
            <>
              {divider}
              {menuItem('Create board from filter', () => { setBoardName(`${filter.name} board`); setCreateBoardOpen(true); })}
            </>
          )}

          {boards.length > 0 && isOwner && (
            <>
              {divider}
              {boards.map(board => {
                const isLinked = filter.used_by_board_ids.includes(board.id);
                return (
                  <React.Fragment key={board.id}>
                    {menuItem(
                      `${isLinked ? '✓ ' : ''}${board.name} board`,
                      () => boardLink.mutate({ filterId: filter.id, boardId: board.id, currentUsedByBoardIds: filter.used_by_board_ids, link: !isLinked }),
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}

          {isOwner && (
            <>
              {divider}
              {menuItem(
                <span style={{ color: token('color.text.danger', '#AE2A19') }}>Delete</span>,
                () => setDeleteOpen(true),
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
        {deleteOpen && (
          <ModalDialog onClose={() => setDeleteOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle appearance="danger">Delete filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, fontSize: 14, color: token('color.text') }}>
                Are you sure you want to delete{' '}
                <strong>{filter.name}</strong>? This action cannot be undone.
              </p>
              {filter.used_by_board_ids.length > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: token('color.text.warning') }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
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
                <p style={{ margin: 0, fontSize: 12, color: token('color.text.subtlest') }}>
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
                    const { data: board, error } = await (supabase as any)
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
                    await (supabase as any)
                      .from('ph_saved_filters')
                      .update({ used_by_board_ids: nextBoardIds })
                      .eq('id', filter.id);
                    setCreateBoardOpen(false);
                    if (projectKey && board?.id) {
                      navigate(`/project-hub/${projectKey}/board/${board.id}`);
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
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
                <p style={{ margin: 0, fontSize: 12, color: token('color.text.subtlest') }}>
                  Issues come live from <strong>{filter.name}</strong>. Items without a date go into an
                  Unscheduled group. Access follows the filter visibility.
                </p>
                {roadmapError && (
                  <p style={{ margin: 0, fontSize: 13, color: token('color.text.danger', '#AE2A19') }}>
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
        {createKanbanOpen && (
          <ModalDialog onClose={() => setCreateKanbanOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Create Kanban from filter</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 653, marginBottom: 4, color: token('color.text.subtle') }}>
                    Board name
                  </label>
                  <Textfield
                    autoFocus
                    value={kanbanName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKanbanName(e.target.value)}
                    placeholder="e.g. Q2 delivery board"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: token(‘color.text.subtlest’) }}>
                  Cards come live from <strong>{filter.name}</strong>.{‘ ‘}
                  {boards.length > 0
                    ? ‘Columns are inherited from this project’s board.’
                    : ‘No existing board found — the board will start with default columns (To Do, In Progress, Done). You can customise them after creation.’
                  }{‘ ‘}
                  Access follows the filter &mdash; anyone who can see the filter can see this board.
                </p>
                {filterProjectMismatch && (
                  <p style={{ margin: 0, fontSize: 12, color: token(‘color.text.warning’, ‘#974F0C’), background: token(‘color.background.warning’, ‘#FFF7D6’), borderRadius: 4, padding: ‘8px 12px’ }}>
                    This filter is scoped to project <strong>{jqlProjectKey}</strong> but you&rsquo;re
                    in <strong>{projectKey?.toUpperCase()}</strong>. The board will use{‘ ‘}
                    <strong>{projectKey?.toUpperCase()}</strong> columns — cards from{‘ ‘}
                    <strong>{jqlProjectKey}</strong> statuses may not map correctly.
                  </p>
                )}
                {kanbanError && (
                  <p style={{ margin: 0, fontSize: 13, color: token('color.text.danger', '#AE2A19') }}>
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
