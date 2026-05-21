import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import MoreIcon from '@atlaskit/icon/core/show-more-horizontal';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';
import {
  useCopyFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  useBoardsForProject,
  useToggleFilterBoardLink,
  type SavedFilterFull,
} from '@/hooks/workhub/useSavedFilters';
import { useParams } from 'react-router-dom';

interface FilterKebabMenuProps {
  filter: SavedFilterFull;
  currentUserId: string | null;
  onEdit: (filter: SavedFilterFull) => void;
  onViewHistory: (filter: SavedFilterFull) => void;
  onTransferOwnership: (filter: SavedFilterFull) => void;
}

interface MenuPos { top: number; right: number }

export function FilterKebabMenu({ filter, currentUserId, onEdit, onViewHistory, onTransferOwnership }: FilterKebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos>({ top: 0, right: 0 });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { key: projectKey } = useParams<{ key: string }>();

  const copyFilter   = useCopyFilter();
  const updateFilter = useUpdateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();
  const boardLink    = useToggleFilterBoardLink();
  const { data: boards = [] } = useBoardsForProject(projectKey);

  const isOwner   = filter.user_id === currentUserId || filter.owner_id === currentUserId;
  const isPrivate = filter.viewers_config?.type === 'private';

  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + window.scrollY + 4,
      right: window.innerWidth - r.right,
    });
    setOpen(true);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleMousedown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMousedown);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleMousedown);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  function handleToggleVisibility() {
    const next = isPrivate
      ? { is_shared: true,  viewers_config: { type: 'org' as const } }
      : { is_shared: false, viewers_config: { type: 'private' as const } };
    updateFilter.mutate({ id: filter.id, updates: next as any });
    setOpen(false);
  }

  const menuItems: { label: string; danger?: boolean; onClick: () => void }[] = [];

  if (isOwner) menuItems.push({ label: 'Edit filter',         onClick: () => { onEdit(filter); setOpen(false); } });
  menuItems.push({             label: 'Copy filter',          onClick: () => { copyFilter.mutate(filter); setOpen(false); } });
  if (isOwner) menuItems.push({ label: isPrivate ? 'Share with organisation' : 'Make private', onClick: handleToggleVisibility });
  menuItems.push({             label: 'Version history',      onClick: () => { onViewHistory(filter); setOpen(false); } });
  if (isOwner) menuItems.push({ label: 'Transfer ownership',  onClick: () => { onTransferOwnership(filter); setOpen(false); } });

  // Board link items
  const boardItems = (boards.length > 0 && isOwner) ? boards.map(board => {
    const isLinked = filter.used_by_board_ids.includes(board.id);
    return {
      label: `${isLinked ? '✓ ' : ''}${board.name} board`,
      onClick: () => {
        boardLink.mutate({ filterId: filter.id, boardId: board.id, currentUsedByBoardIds: filter.used_by_board_ids, link: !isLinked });
        setOpen(false);
      },
    };
  }) : [];

  const dangerItems = isOwner ? [{ label: 'Delete', danger: true, onClick: () => { setDeleteConfirmOpen(true); setOpen(false); } }] : [];

  const allSections = [menuItems, boardItems, dangerItems].filter(s => s.length > 0);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Filter actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          padding: 0,
          border: 'none',
          borderRadius: 3,
          background: 'transparent',
          color: token('color.text.subtle'),
          cursor: 'pointer',
        }}
      >
        <MoreIcon label="" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            minWidth: 180,
            background: token('elevation.surface.overlay'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay'),
            border: `1px solid ${token('color.border')}`,
            padding: '4px 0',
            outline: 'none',
          }}
        >
          {allSections.map((section, si) => (
            <React.Fragment key={si}>
              {si > 0 && (
                <div style={{ height: 1, background: token('color.border'), margin: '4px 0' }} />
              )}
              {section.map((item, ii) => (
                <button
                  key={ii}
                  role="menuitem"
                  onClick={item.onClick}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: item.danger ? token('color.text.danger') : token('color.text'),
                    fontFamily: 'var(--cp-font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'))}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.label}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}

      <DangerConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => { deleteFilter.mutate(filter.id); setDeleteConfirmOpen(false); }}
        title={`Delete "${filter.name}"?`}
        description={`This filter will be permanently deleted. This action cannot be undone.`}
        hint=""
        skipPhraseGate
        isLoading={deleteFilter.isPending}
      />
    </>
  );
}
