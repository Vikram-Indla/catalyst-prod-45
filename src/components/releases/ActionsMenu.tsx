import React from 'react';
import DropdownMenu from '@atlaskit/dropdown-menu';
import { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Button from '@atlaskit/button/new';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { Release } from '@/types/phase3-releases';

interface ActionsMenuProps {
  release: Release;
  onEdit: (release: Release) => void;
  onArchive: (release: Release) => void;
  onRelease: (release: Release) => void;
  onDelete: (release: Release) => void;
  onMerge?: (release: Release) => void;
}

export function ActionsMenu({
  release,
  onEdit,
  onArchive,
  onRelease,
  onDelete,
  onMerge,
}: ActionsMenuProps) {
  return (
    <DropdownMenu
      trigger={({ triggerRef, isOpen, ...triggerProps }) => (
        <Button
          ref={triggerRef}
          {...triggerProps}
          appearance="subtle"
          isSelected={isOpen}
          icon={<MoreIcon label="Actions" />}
          aria-haspopup="menu"
        />
      )}
    >
      {/* Group 1: Primary actions */}
      <DropdownItemGroup>
        {release.status === 'unreleased' && (
          <DropdownItem
            onClick={() => onRelease(release)}
          >
            Release
          </DropdownItem>
        )}

        <DropdownItem
          onClick={() => onEdit(release)}
        >
          Edit
        </DropdownItem>

        {onMerge && (
          <DropdownItem
            onClick={() => onMerge(release)}
          >
            Merge
          </DropdownItem>
        )}

        {release.status !== 'unreleased' && (
          <DropdownItem
            onClick={() => onDelete(release)}
          >
            Delete
          </DropdownItem>
        )}
      </DropdownItemGroup>

      {/* Group 2: Secondary actions */}
      <DropdownItemGroup>
        {/* Unrelease - disabled/hidden for now (Tier 3 future) */}
        {/* {release.status === 'released' && (
          <DropdownItem isDisabled>Unrelease</DropdownItem>
        )} */}

        <DropdownItem
          onClick={() => onArchive(release)}
        >
          Archive
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}
