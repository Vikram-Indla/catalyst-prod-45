/**
 * Folder Context Menu - Right-click menu for folder actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, Edit, Move, Trash2, FolderKanban, Calendar } from 'lucide-react';
import type { FolderNode as FolderNodeType, EntityType } from '@/types/folder';
import { deleteFolder } from '@/services/folderService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FolderContextMenuProps {
  folder: FolderNodeType;
  position: { x: number; y: number };
  onClose: () => void;
  onRefresh: () => void;
  entityType: EntityType;
  programId: string;
}

export const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  folder,
  position,
  onClose,
  onRefresh,
  entityType,
  programId
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleDelete = async () => {
    try {
      await deleteFolder(folder.id);
      toast({
        title: 'Folder deleted',
        description: `"${folder.name}" has been deleted`
      });
      onRefresh();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error deleting folder',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const menuItems = [
    {
      icon: FolderPlus,
      label: 'Create Subfolder',
      onClick: () => {
        // TODO: Open create modal with this folder as parent
        onClose();
      },
      disabled: folder.is_system
    },
    {
      icon: Edit,
      label: 'Rename',
      onClick: () => {
        // TODO: Open rename modal
        onClose();
      },
      disabled: folder.is_system
    },
    {
      icon: Move,
      label: 'Move to...',
      onClick: () => {
        // TODO: Open move modal
        onClose();
      },
      disabled: folder.is_system
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: handleDelete,
      disabled: folder.is_system || folder.count > 0,
      danger: true
    },
    { divider: true },
    {
      icon: FolderKanban,
      label: 'Create Set from Folder',
      onClick: () => {
        // TODO: Create set from folder items
        onClose();
      }
    },
    {
      icon: Calendar,
      label: 'Create Cycle from Folder',
      onClick: () => {
        // TODO: Create cycle from folder items
        onClose();
      }
    }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-md border bg-popover p-1 shadow-md"
      style={{
        top: position.y,
        left: position.x
      }}
    >
      {menuItems.map((item, index) => {
        if ('divider' in item) {
          return <div key={index} className="my-1 h-px bg-border" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
              'hover:bg-accent hover:text-accent-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              item.danger && 'text-destructive hover:text-destructive'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
