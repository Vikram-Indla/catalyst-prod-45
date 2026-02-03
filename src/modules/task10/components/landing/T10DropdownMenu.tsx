// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ DROPDOWN MENU COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Edit2, Archive, Trash2, RotateCcw } from 'lucide-react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: 'edit' | 'archive' | 'delete' | 'restore';
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface T10DropdownMenuProps {
  items: DropdownMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

const iconMap = {
  edit: Edit2,
  archive: Archive,
  delete: Trash2,
  restore: RotateCcw,
};

export function T10DropdownMenu({ items, position, onClose }: T10DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // If the user scrolls, a fixed-position menu can look like a "bottom toolbar".
    // Close it immediately to avoid a persistent floating action strip.
    const handleScrollOrResize = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  return (
    <>
      <div className="t10-dropdown-menu__backdrop" onClick={onClose} />
      <div
        ref={menuRef}
        className="t10-dropdown-menu"
        style={{ top: position.y, left: position.x }}
      >
        {items.map((item) => {
          const Icon = item.icon ? iconMap[item.icon] : null;
          return (
            <button
              key={item.id}
              className={`t10-dropdown-menu__item ${
                item.variant === 'danger' ? 't10-dropdown-menu__item--danger' : ''
              }`}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {Icon && <Icon className="t10-dropdown-menu__icon" />}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default T10DropdownMenu;

