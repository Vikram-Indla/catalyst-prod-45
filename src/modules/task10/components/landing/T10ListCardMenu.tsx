// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListCardMenu
// Purpose: Dropdown menu for list card actions (Rename, Delete)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface T10ListCardMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

export function T10ListCardMenu({ onRename, onDelete }: T10ListCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsOpen(!isOpen);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onRename();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete();
  };

  return (
    <div className="t10-card-menu" ref={menuRef}>
      <button
        type="button"
        className="t10-card-menu-trigger"
        onClick={handleToggle}
        aria-label="List options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="t10-card-menu-dropdown" role="menu">
          <button
            type="button"
            className="t10-card-menu-item"
            onClick={handleRename}
            role="menuitem"
          >
            <Edit2 size={16} />
            Rename
          </button>
          <div className="t10-card-menu-divider" />
          <button
            type="button"
            className="t10-card-menu-item t10-card-menu-item-danger"
            onClick={handleDelete}
            role="menuitem"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default T10ListCardMenu;
