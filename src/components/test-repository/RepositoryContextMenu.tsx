/**
 * Repository Context Menu
 * Right-click menu for tree items
 */

import { useEffect, useRef } from 'react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { FolderPlus, FileText, Edit, Copy, FolderInput, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RepositoryContextMenuProps {
  target: { id: string; type: string; x: number; y: number };
  onClose: () => void;
}

export function RepositoryContextMenu({ target, onClose }: RepositoryContextMenuProps) {
  const { startRename } = useRepositoryStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isFolder = target.type === 'folder';

  const handleRename = () => {
    startRename(target.id);
    onClose();
  };

  const menuItems = [
    ...(isFolder ? [
      { icon: FolderPlus, label: 'New Folder', onClick: () => onClose() },
      { icon: FileText, label: 'New Test Suite', onClick: () => onClose() },
      { divider: true },
    ] : []),
    { icon: Edit, label: 'Rename', onClick: handleRename },
    { icon: Copy, label: 'Duplicate', onClick: () => onClose() },
    { icon: FolderInput, label: 'Move to...', onClick: () => onClose() },
    { divider: true },
    { icon: Trash2, label: 'Delete', onClick: () => onClose(), danger: true },
  ];

  // Position the menu
  const style: React.CSSProperties = {
    position: 'fixed',
    left: target.x,
    top: target.y,
    zIndex: 200,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
    >
      {menuItems.map((item, idx) => {
        if ('divider' in item && item.divider) {
          return <div key={idx} className="my-1 border-t border-border" />;
        }
        const Icon = item.icon!;
        return (
          <button
            key={idx}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors",
              "hover:bg-muted",
              item.danger ? "text-destructive hover:bg-destructive/10" : "text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
