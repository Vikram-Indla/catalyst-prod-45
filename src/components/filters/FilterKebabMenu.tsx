import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
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
import { ENABLE_FILTER_TO_KANBAN } from '@/lib/featureFlags';
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
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardType, setBoardType] = useState<{ label: string; value: string }>({ label: 'Kanban', value: 'kanban' });
  const [creatingBoard, setCreatingBoard] = useState(false);
  // Filter→Kanban (ENABLE_FILTER_TO_KANBAN) — guided create flow.
  const [createKanbanOpen, setCreateKanbanOpen] = useState(false);
  const [kanbanName, setKanbanName] = useState('');
  const navigate = useNavigate();

  const { key: projectKey } = useParams<{ key: string }>();

  const copyFilter       = useCopyFilter();
  const updateFilter     = useUpdateSavedFilter();
  const deleteFilter     = useDeleteSavedFilter();
  const boardLink        = useToggleFilterBoardLink();
  const subscribeFilter  = useToggleFilterSubscription();
  const { data: boards = [] } = useBoardsForProject(projectKey);

  // Filter→Kanban: dedup (open an existing board for this filter+owner instead
  // of creating a second), the project's primary board to clone columns from,
  // and the canonical create service. All inert when the flag is off.
  const createKanban = useCreateKanbanFromFilter();
  const existingBoard = useExistingBoardForFilter(
    ENABLE_FILTER_TO_KANBAN ? filter.id : undefined,
    currentUserId,
  );
  const { data: projectId = null } = useQuery({
    queryKey: ['ph-project-id', projectKey],
    queryFn: async () => {
      if (!projectKey) return null;
      const { data } = await supabase
        .from('ph_projects').select('id').eq('key', projectKey.toUpperCase()).maybeSingle();
      return (data as any)?.id ?? null;
    },
    enabled: ENABLE_FILTER_TO_KANBAN && !!projectKey,
    staleTime: 300_000,
  });

  const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isSubscribed = currentUserId ? (filter.subscriber_ids ?? []).includes(currentUserId) : false;
  const isPrivate = filter.viewers_config?.type === 'private';

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };

    updateFilter.mutate({ id: filter.id, updates: next as any });
  }

  async function handleCreateKanban() {
    try {
      const boardId = await createKanban.mutateAsync({
        filter,
        projectId,
        sourceBoardId: boards[0]?.id ?? null, // project's existing board → column template
        name: kanbanName.trim(),
        visibility: isPrivate ? 'private' : 'project',
      });
      setCreateKanbanOpen(false);
      if (projectKey && boardId) navigate(`/project-hub/${projectKey}/boards/${boardId}`);
    } catch (e: any) {
      console.error('Failed to create Kanban from filter:', e);
    }
  }

  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        trigger={({ triggerRef, ...triggerProps }) => (
          <button
            {...triggerProps}
            ref={triggerRef}
            type="button"
            aria-label="Filter actions"
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
        )}
      >
        <DropdownItemGroup>
          {isOwner && (
            <DropdownItem onClick={() => setEditOpen(true)}>
              Edit filter
            </DropdownItem>
          )}
          <DropdownItem onClick={() => copyFilter.mutate(filter)}>
            Copy filter
          </DropdownItem>
          <DropdownItem
            onClick={() => {
              const base = window.location.origin;
              const path = projectKey
                ? `/project-hub/${projectKey}/filters/${filter.id}`
                : `/product-hub/filters/${filter.id}`;
              navigator.clipboard.writeText(base + path).catch(() => {});
            }}
          >
            Copy link
          </DropdownItem>
          <DropdownItem
            onClick={() => subscribeFilter.mutate({ filterId: filter.id, currentSubscriberIds: filter.subscriber_ids ?? [], userId: currentUserId ?? '' })}
            isDisabled={!currentUserId}
          >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
          </DropdownItem>
          {isOwner && (
            <DropdownItem onClick={handleToggleVisibility}>
              {isPrivate ? 'Share with organisation' : 'Make private'}
            </DropdownItem>
          )}
          <DropdownItem onClick={() => setHistoryOpen(true)}>
            View version history
          </DropdownItem>
            {isOwner && (
            <DropdownItem onClick={() => setTransferOpen(true)}>
              Change owner
            </DropdownItem>
          )}
        </DropdownItemGroup>

        {isOwner && (
          <DropdownItemGroup>
            {ENABLE_FILTER_TO_KANBAN ? (
              <DropdownItem
                onClick={() => {
                  // Dedup: if a board already exists for this filter+owner, open it.
                  if (existingBoard.data) {
                    if (projectKey) navigate(`/project-hub/${projectKey}/boards/${existingBoard.data.id}`);
                    return;
                  }
                  setKanbanName(`${filter.name} board`);
                  setCreateKanbanOpen(true);
                }}
              >
                {existingBoard.data ? 'Open Kanban' : 'Create Kanban from filter'}
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => { setBoardName(`${filter.name} board`); setCreateBoardOpen(true); }}>
                Create board from filter
              </DropdownItem>
            )}
          </DropdownItemGroup>
        )}

        {/* Board link items — one per board (O10) */}
        {boards.length > 0 && isOwner && (
          <DropdownItemGroup>
            {boards.map(board => {
              const isLinked = filter.used_by_board_ids.includes(board.id);
              return (
                <DropdownItem
                  key={board.id}
                  onClick={() => boardLink.mutate({
                    filterId: filter.id,
                    boardId: board.id,
                    currentUsedByBoardIds: filter.used_by_board_ids,
                    link: !isLinked,
                  })}
                >
                  {isLinked ? '✓ ' : ''}{board.name} board
                </DropdownItem>
              );
            })}
          </DropdownItemGroup>
        )}
        <DropdownItemGroup>
          {isOwner && (
            <DropdownItem onClick={() => setDeleteOpen(true)}>
              <span style={{ color: token('color.text.danger') }}>Delete</span>
            </DropdownItem>
          )}
        </DropdownItemGroup>
      </DropdownMenu>

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

      {/* Filter→Kanban (ENABLE_FILTER_TO_KANBAN) — guided create flow. */}
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
                <p style={{ margin: 0, fontSize: 12, color: token('color.text.subtlest') }}>
                  Cards come live from <strong>{filter.name}</strong>. Columns are inherited from this
                  project&rsquo;s board. Access follows the filter &mdash; anyone who can see the filter can
                  see this board.
                </p>
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
