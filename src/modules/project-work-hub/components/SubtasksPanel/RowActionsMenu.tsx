/**
 * RowActionsMenu — Atlaskit DropdownMenu per-row (···).
 *   Open subtask · Rename · Delete (destructive)
 */
import React from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { MoreHorizontal, ExternalLink, Pencil, Trash2 } from 'lucide-react';

interface RowActionsMenuProps {
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function RowActionsMenu({ onOpen, onRename, onDelete }: RowActionsMenuProps) {
  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={({ triggerRef, ...triggerProps }) => (
        <button
          {...triggerProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          className="sp-row-actions-btn"
          aria-label="Row actions"
          onClick={(e) => { e.stopPropagation(); triggerProps.onClick?.(e as unknown as never); }}
        >
          <MoreHorizontal size={14} />
        </button>
      )}
    >
      <DropdownItemGroup>
        <DropdownItem
          elemBefore={<ExternalLink size={14} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))" />}
          onClick={() => onOpen()}
        >
          Open subtask
        </DropdownItem>
        <DropdownItem
          elemBefore={<Pencil size={14} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))" />}
          onClick={() => onRename()}
        >
          Rename
        </DropdownItem>
      </DropdownItemGroup>
      <DropdownItemGroup>
        <DropdownItem
          elemBefore={<Trash2 size={14} color="#BF2600" />}
          onClick={() => onDelete()}
        >
          <span style={{ color: '#BF2600' }}>Delete</span>
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}
