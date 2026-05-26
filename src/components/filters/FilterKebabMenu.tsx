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
  useToggleFilterSubscription,
  useBoardsForProject,
  useToggleFilterBoardLink,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
import { useParams } from 'react-router-dom';
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

  const { key: projectKey } = useParams<{ key: string }>();

  const copyFilter       = useCopyFilter();
  const updateFilter     = useUpdateSavedFilter();
  const deleteFilter     = useDeleteSavedFilter();
  const toggleSubscribe  = useToggleFilterSubscription();
  const boardLink        = useToggleFilterBoardLink();
  const { data: boards = [] } = useBoardsForProject(projectKey);

  const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isPrivate = filter.viewers_config?.type === 'private';
  const isSubscribed = currentUserId ? (filter.subscriber_ids ?? []).includes(currentUserId) : false;

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };

    updateFilter.mutate({ id: filter.id, updates: next as any });
  }

  return (
    <>
      <DropdownMenu
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
          {currentUserId && (
            <DropdownItem
              onClick={() => toggleSubscribe.mutate({
                filterId: filter.id,
                currentSubscriberIds: filter.subscriber_ids ?? [],
                userId: currentUserId,
              })}
            >
              {isSubscribed ? 'Unsubscribe from changes' : 'Subscribe to changes'}
            </DropdownItem>
          )}
          {isOwner && (
            <DropdownItem onClick={() => setTransferOpen(true)}>
              Transfer ownership
            </DropdownItem>
          )}
        </DropdownItemGroup>

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
    </>
  );
}
