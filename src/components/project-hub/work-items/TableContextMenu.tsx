import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Copy, CopyPlus, Flag, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  itemKey: string;
  isFlagged: boolean;
  onClose: () => void;
  onOpenDetail: () => void;
  onCopyKey: () => void;
  onClone: () => void;
  onToggleFlag: () => void;
  onDelete: () => void;
}

export function TableContextMenu({
  x, y, itemKey, isFlagged, onClose,
  onOpenDetail, onCopyKey, onClone, onToggleFlag, onDelete,
}: ContextMenuProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(onClose);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Prevent going off screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 220);

  const items = [
    { icon: ExternalLink, label: 'Open detail', action: onOpenDetail },
    { icon: Copy, label: `Copy key (${itemKey})`, action: onCopyKey },
    { icon: CopyPlus, label: 'Clone item', action: onClone },
    { icon: Flag, label: isFlagged ? 'Remove flag' : 'Flag item', action: onToggleFlag },
  ];

  return createPortal(
    <div
      style={{
        position: 'fixed', top: adjustedY, left: adjustedX, zIndex: 99999,
        width: 200, background: 'var(--cp-float)', border: '1px solid var(--divider)',
        borderRadius: 6, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        fontFamily: 'var(--cp-font-body)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="py-1">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => { item.action(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[var(--ds-surface-sunken,#F8FAFC)] text-left transition-colors"
              style={{ color: 'var(--fg-2)' }}
            >
              <Icon size={13} className="text-[var(--ds-text-subtlest,#94A3B8)]" />
              {item.label}
            </button>
          );
        })}
        <div style={{ borderTop: '1px solid var(--cp-bd-zone)', margin: '2px 0' }} />
        {deleteConfirm ? (
          <div className="px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--sem-danger)' }}>Confirm?</span>
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--ds-text-danger,#DC2626)] text-white"
            >
              Yes
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-[11px] px-2 py-0.5 text-[var(--ds-text-subtlest,#64748B)]"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[var(--ds-background-danger,#FEF2F2)] text-left transition-colors"
            style={{ color: 'var(--sem-danger)' }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
