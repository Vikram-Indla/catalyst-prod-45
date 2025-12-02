/**
 * Folder Tree - Recursive tree component with drag-drop support
 */

import React, { useState } from 'react';
import { FolderNode as FolderNodeComponent } from './FolderNode';
import type { FolderNode, EntityType } from '@/types/folder';
import { reorderFolders } from '@/services/folderService';
import { useToast } from '@/hooks/use-toast';

interface FolderTreeProps {
  folders: FolderNode[];
  entityType: EntityType;
  programId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  expandedFolders: string[];
  onToggleFolder: (folderId: string) => void;
  onRefresh: () => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  entityType,
  programId,
  selectedFolderId,
  onFolderSelect,
  expandedFolders,
  onToggleFolder,
  onRefresh
}) => {
  const [draggedFolder, setDraggedFolder] = useState<FolderNode | null>(null);
  const { toast } = useToast();

  const handleDragStart = (folder: FolderNode) => {
    if (folder.is_system) return;
    setDraggedFolder(folder);
  };

  const handleDragEnd = () => {
    setDraggedFolder(null);
  };

  const handleDrop = async (targetFolder: FolderNode, position: 'inside' | 'before' | 'after') => {
    if (!draggedFolder || draggedFolder.id === targetFolder.id) return;

    try {
      // Calculate new sort orders based on drop position
      const siblings = folders.filter(f => f.parent_id === targetFolder.parent_id);
      const targetIndex = siblings.findIndex(f => f.id === targetFolder.id);
      
      let newSortOrder: number;
      if (position === 'before') {
        newSortOrder = targetFolder.sort_order - 1;
      } else if (position === 'after') {
        newSortOrder = targetFolder.sort_order + 1;
      } else {
        // Inside - becomes first child
        newSortOrder = 0;
      }

      await reorderFolders({
        folder_orders: [{ id: draggedFolder.id, sort_order: newSortOrder }]
      });

      toast({
        title: 'Folder moved',
        description: `"${draggedFolder.name}" has been moved successfully`
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error moving folder',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const renderFolders = (nodes: FolderNode[], level: number = 0) => {
    return nodes.map((folder) => (
      <div key={folder.id}>
        <FolderNodeComponent
          folder={folder}
          level={level}
          isSelected={selectedFolderId === folder.id}
          isExpanded={expandedFolders.includes(folder.id)}
          isDragging={draggedFolder?.id === folder.id}
          onSelect={onFolderSelect}
          onToggle={onToggleFolder}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onRefresh={onRefresh}
          entityType={entityType}
          programId={programId}
        />
        {folder.children.length > 0 && expandedFolders.includes(folder.id) && (
          <div className="ml-4">
            {renderFolders(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="folder-tree space-y-0.5">
      {renderFolders(folders)}
    </div>
  );
};
