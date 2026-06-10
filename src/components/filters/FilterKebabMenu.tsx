import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { IconButton } from '@atlaskit/button/new';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { MoreHorizontal } from '@/lib/atlaskit-icons';
import {
  useCopyFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  useBoardsForProject,
  useToggleFilterBoardLink,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
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
  const navigate = useNavigate();

  const { key: projectKey } = useParams<{ key: string }>();

  const copyFilter       = useCopyFilter();
  const updateFilter     = useUpdateSavedFilter();
  const deleteFilter     = useDeleteSavedFilter();
  const boardLink        = useToggleFilterBoardLink();
  const { data: boards = [] } = useBoardsForProject(projectKey);

  const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isPrivate = filter.viewers_config?.type === 'private';

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };

    updateFilter.mutate({ id: filter.id, updates: next as any });
  }

  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        trigger={({ triggerRef, ...props }) => (
          <IconButton
            ref={triggerRef}
            {...props}
            icon={MoreHorizontal}
            label="Filter actions"
            appearance="subtle"
            spacing="compact"
          />
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
            <DropdownItem onClick={() => { setBoardName(`${filter.name} board`); setCreateBoardOpen(true); }}>
              Create board from filter
            </DropdownItem>
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
    </>
  );
}
