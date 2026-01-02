/**
 * Folder Tree Component
 * Hierarchical folder navigation with drag-drop reorder
 */

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderInput,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTestFolders,
  useFolderExpandedState,
  TestFolder,
  FolderEntityType,
} from '../../hooks/useTestFolders';

interface FolderTreeProps {
  programId: string | null;
  entityType: FolderEntityType;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  className?: string;
}

export function FolderTree({
  programId,
  entityType,
  selectedFolderId,
  onSelectFolder,
  className,
}: FolderTreeProps) {
  const {
    folders,
    folderTree,
    isLoading,
    createFolder,
    renameFolder,
    moveFolder,
    reorderFolders,
    deleteFolder,
    isCreating,
    isRenaming,
    isMoving,
    isDeleting,
  } = useTestFolders(programId, entityType);

  const {
    expandedIds,
    toggleExpanded,
    expandAll,
    collapseAll,
    isExpanded,
  } = useFolderExpandedState(programId, entityType);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);

  // Create folder
  const handleCreate = async () => {
    if (!programId || !newFolderName.trim()) return;
    try {
      await createFolder({
        name: newFolderName.trim(),
        parent_folder_id: createParentId,
        program_id: programId,
        entity_type: entityType,
      });
      setCreateDialogOpen(false);
      setNewFolderName('');
      setCreateParentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Rename folder
  const handleRename = async () => {
    if (!renameFolderId || !renameValue.trim()) return;
    try {
      await renameFolder({ id: renameFolderId, name: renameValue.trim() });
      setRenameDialogOpen(false);
      setRenameFolderId(null);
      setRenameValue('');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete folder
  const handleDelete = async () => {
    if (!deleteFolderId) return;
    try {
      await deleteFolder(deleteFolderId);
      if (selectedFolderId === deleteFolderId) {
        onSelectFolder(null);
      }
      setDeleteDialogOpen(false);
      setDeleteFolderId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Open create dialog
  const openCreateDialog = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
  };

  // Open rename dialog
  const openRenameDialog = (folder: TestFolder) => {
    setRenameFolderId(folder.id);
    setRenameValue(folder.name);
    setRenameDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (folderId: string) => {
    setDeleteFolderId(folderId);
    setDeleteDialogOpen(true);
  };

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Get the folder being moved
    const draggedId = result.draggableId;
    const draggedFolder = folders.find(f => f.id === draggedId);
    if (!draggedFolder) return;

    // Determine if we're changing parent or just reordering
    const destDroppableId = result.destination.droppableId;
    const newParentId = destDroppableId === 'root' ? null : destDroppableId;

    // Get siblings at destination
    const siblings = folders
      .filter(f => f.parent_folder_id === newParentId && f.id !== draggedId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    // Calculate new sort order
    let newSortOrder: number;
    if (destIndex === 0) {
      newSortOrder = (siblings[0]?.sort_order ?? 1) - 1;
    } else if (destIndex >= siblings.length) {
      newSortOrder = (siblings[siblings.length - 1]?.sort_order ?? 0) + 1;
    } else {
      const prevOrder = siblings[destIndex - 1]?.sort_order ?? 0;
      const nextOrder = siblings[destIndex]?.sort_order ?? prevOrder + 2;
      newSortOrder = (prevOrder + nextOrder) / 2;
    }

    try {
      await moveFolder({
        id: draggedId,
        newParentId,
        newSortOrder,
      });
    } catch (err) {
      console.error(err);
    }
  }, [folders, moveFolder]);

  if (isLoading) {
    return (
      <div className={cn('space-y-1', className)}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Folders
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => openCreateDialog(null)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => expandAll(folders.map(f => f.id))}>
                Expand All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => collapseAll()}>
                Collapse All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* All Items option */}
      <button
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm transition-colors w-full text-left',
          selectedFolderId === null
            ? 'bg-accent-subtle text-accent-primary font-medium'
            : 'text-text-secondary hover:bg-surface-2'
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        All Items
      </button>

      {/* Folder Tree */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="root" type="folder">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'flex-1 overflow-y-auto py-1',
                snapshot.isDraggingOver && 'bg-accent-subtle/30'
              )}
            >
              {folderTree.length === 0 ? (
                <div className="px-3 py-4 text-center text-text-quaternary">
                  <Folder className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No folders yet</p>
                </div>
              ) : (
                folderTree.map((folder, index) => (
                  <FolderNode
                    key={folder.id}
                    folder={folder}
                    index={index}
                    depth={0}
                    selectedId={selectedFolderId}
                    onSelect={onSelectFolder}
                    isExpanded={isExpanded}
                    onToggle={toggleExpanded}
                    onCreateSub={(id) => openCreateDialog(id)}
                    onRename={openRenameDialog}
                    onDelete={openDeleteDialog}
                    folders={folders}
                  />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createParentId ? 'Create Subfolder' : 'Create Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newFolderName.trim() || isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming}>
              {isRenaming && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the folder and move its contents to the parent folder.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-status-error hover:bg-status-error/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Individual folder node
interface FolderNodeProps {
  folder: TestFolder;
  index: number;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onCreateSub: (parentId: string) => void;
  onRename: (folder: TestFolder) => void;
  onDelete: (id: string) => void;
  folders: TestFolder[];
}

function FolderNode({
  folder,
  index,
  depth,
  selectedId,
  onSelect,
  isExpanded,
  onToggle,
  onCreateSub,
  onRename,
  onDelete,
  folders,
}: FolderNodeProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const expanded = isExpanded(folder.id);
  const isSelected = selectedId === folder.id;

  return (
    <Draggable draggableId={folder.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <div
            className={cn(
              'group flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors',
              isSelected
                ? 'bg-accent-subtle text-accent-primary'
                : 'text-text-secondary hover:bg-surface-2',
              snapshot.isDragging && 'opacity-70 bg-surface-3'
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-3.5 w-3.5 text-text-quaternary" />
            </div>

            {/* Expand/collapse toggle */}
            <button
              className="p-0.5 hover:bg-surface-3 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(folder.id);
              }}
            >
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )
              ) : (
                <span className="w-3.5" />
              )}
            </button>

            {/* Folder icon */}
            {expanded && hasChildren ? (
              <FolderOpen className="h-4 w-4 text-accent-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-text-tertiary flex-shrink-0" />
            )}

            {/* Name */}
            <button
              className="flex-1 text-left text-sm truncate"
              onClick={() => onSelect(folder.id)}
            >
              {folder.name}
            </button>

            {/* Count badge - could show item count */}
            {/* <Badge variant="outline" className="text-[10px] h-4 px-1">0</Badge> */}

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateSub(folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(folder)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(folder.id)}
                  className="text-status-error focus:text-status-error"
                  disabled={folder.is_system ?? false}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Children (nested droppable) */}
          {hasChildren && expanded && (
            <Droppable droppableId={folder.id} type="folder">
              {(childProvided, childSnapshot) => (
                <div
                  ref={childProvided.innerRef}
                  {...childProvided.droppableProps}
                  className={cn(
                    'min-h-[4px]',
                    childSnapshot.isDraggingOver && 'bg-accent-subtle/30'
                  )}
                >
                  {folder.children!.map((child, childIndex) => (
                    <FolderNode
                      key={child.id}
                      folder={child}
                      index={childIndex}
                      depth={depth + 1}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      isExpanded={isExpanded}
                      onToggle={onToggle}
                      onCreateSub={onCreateSub}
                      onRename={onRename}
                      onDelete={onDelete}
                      folders={folders}
                    />
                  ))}
                  {childProvided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default FolderTree;
