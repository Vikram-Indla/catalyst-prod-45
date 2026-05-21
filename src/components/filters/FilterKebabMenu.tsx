import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { IconButton } from '@atlaskit/button/new';
import MoreIcon from '@atlaskit/icon/core/show-more-horizontal';
import ModalTransition from '@atlaskit/modal-dialog';
import { toast } from 'sonner';
import {
  useCopyFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
import { FilterSaveModal } from './FilterSaveModal';
import { FilterVersionHistory } from './FilterVersionHistory';

interface FilterKebabMenuProps {
  filter: SavedFilterFull;
  currentUserId: string | null;
}

export function FilterKebabMenu({ filter, currentUserId }: FilterKebabMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const copyFilter = useCopyFilter();
  const updateFilter = useUpdateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();

  const isOwner = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isPrivate = filter.viewers_config?.type === 'private';

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };

    updateFilter.mutate({ id: filter.id, updates: next as any });
    toast.success(isPrivate ? 'Filter shared with organisation' : 'Filter set to private');
  }

  return (
    <>
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <IconButton
            ref={triggerRef}
            {...props}
            icon={MoreIcon}
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
        </DropdownItemGroup>
        <DropdownItemGroup>
          {isOwner && (
            <DropdownItem onClick={() => deleteFilter.mutate(filter.id)}>
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
    </>
  );
}
