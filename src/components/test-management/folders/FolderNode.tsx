/**
 * Folder Node - Individual folder item with drag-drop and context menu
 */

import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import type { FolderNode as FolderNodeType, EntityType } from '@/types/folder';
import { FolderContextMenu } from './FolderContextMenu';
import { cn } from '@/lib/utils';

interface FolderNodeComponentProps {
  folder: FolderNodeType;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  isDragging?: boolean;
  onSelect: (folderId: string | null) => void;
  onToggle: (folderId: string) => void;
  onDragStart: (folder: FolderNodeType) => void;
  onDragEnd: () => void;
  onDrop: (folder: FolderNodeType, position: 'inside' | 'before' | 'after') => void;
  onRefresh: () => void;
  entityType: EntityType;
  programId: string;
}

export const FolderNode: React.FC<FolderNodeComponentProps> = ({
  folder,
  level,
  isSelected,
  isExpanded,
  isDragging,
  onSelect,
  onToggle,
  onDragStart,
  onDragEnd,
  onDrop,
  onRefresh,
  entityType,
  programId
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState<'inside' | 'before' | 'after' | null>(null);

  const hasChildren = folder.children.length > 0;
  const isSystemFolder = folder.is_system;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(folder.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(folder.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isSystemFolder) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    onDragStart(folder);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSystemFolder || isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) {
      setDragOver('before');
    } else if (y > height * 0.75) {
      setDragOver('after');
    } else {
      setDragOver('inside');
    }
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dragOver) {
      onDrop(folder, dragOver);
    }
    
    setDragOver(null);
  };

  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <>
      <div
        draggable={!isSystemFolder}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'folder-node group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
          'hover:bg-surface-gray-100',
          isSelected && 'bg-brand-gold/10 border border-brand-gold',
          isDragging && 'opacity-50',
          dragOver === 'inside' && 'bg-brand-gold/20',
          dragOver === 'before' && 'border-t-2 border-brand-gold',
          dragOver === 'after' && 'border-b-2 border-brand-gold'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Chevron for expandable folders */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 p-0.5 hover:bg-surface-gray-200 rounded"
          >
            <ChevronIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Folder icon */}
        <FolderIcon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isSystemFolder ? 'text-muted-foreground' : 'text-brand-gold'
          )}
        />

        {/* Folder name */}
        <span className={cn(
          'flex-1 text-sm truncate',
          isSystemFolder && 'text-muted-foreground'
        )}>
          {folder.name}
        </span>

        {/* Count badge */}
        <span className="flex-shrink-0 text-xs text-muted-foreground bg-surface-gray-100 px-1.5 py-0.5 rounded">
          {folder.count}
        </span>

        {/* More actions */}
        {!isSystemFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
            className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-surface-gray-200 rounded"
          >
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FolderContextMenu
          folder={folder}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onRefresh={onRefresh}
          entityType={entityType}
          programId={programId}
        />
      )}
    </>
  );
};
