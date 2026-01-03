/**
 * Test Folder Tree Component
 * Hierarchical folder tree with CRUD, drag-drop, and selection
 */

import React, { useState, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  useTestFolders, 
  useFolderExpandedState,
  TestFolder,
  FolderEntityType,
} from '@/modules/in-jira/hooks/useTestFolders';

interface TestFolderTreeProps {
  programId: string | null;
  entityType: FolderEntityType;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  className?: string;
}

export function TestFolderTree({
  programId,
  entityType,
  selectedFolderId,
  onSelectFolder,
  className,
}: TestFolderTreeProps) {
  const {
    folderTree,
    flatFolders,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    isCreating,
    isRenaming,
    isDeleting,
  } = useTestFolders(programId, entityType);

  const {
    expandedIds,
    toggleExpanded,
    expandAll,
    collapseAll,
  } = useFolderExpandedState(programId, entityType);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<TestFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !programId) return;
    
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
      console.error('Failed to create folder:', err);
    }
  }, [newFolderName, programId, createParentId, entityType, createFolder]);

  const handleRename = useCallback(async () => {
    if (!renameValue.trim() || !renamingFolder) return;
    
    try {
      await renameFolder({ id: renamingFolder.id, name: renameValue.trim() });
      setRenameDialogOpen(false);
      setRenamingFolder(null);
      setRenameValue('');
    } catch (err) {
      console.error('Failed to rename folder:', err);
    }
  }, [renameValue, renamingFolder, renameFolder]);

  const handleDelete = useCallback(async (folder: TestFolder) => {
    if (!confirm(`Delete folder "${folder.name}"? Items will be moved to parent folder.`)) return;
    
    try {
      await deleteFolder(folder.id);
      if (selectedFolderId === folder.id) {
        onSelectFolder(folder.parent_folder_id);
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  }, [deleteFolder, selectedFolderId, onSelectFolder]);

  const openCreateDialog = useCallback((parentId: string | null = null) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
  }, []);

  const openRenameDialog = useCallback((folder: TestFolder) => {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
    setRenameDialogOpen(true);
  }, []);

  if (!programId) {
    return (
      <div className={cn('p-4 text-center text-text-tertiary text-sm', className)}>
        Select a project to view folders
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('p-2 space-y-2', className)}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          Folders
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => openCreateDialog(null)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* All items (no folder) */}
          <button
            onClick={() => onSelectFolder(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
              selectedFolderId === null
                ? 'bg-accent-subtle text-accent-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            )}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate">All {entityType === 'test_cases' ? 'Cases' : entityType === 'test_sets' ? 'Sets' : 'Cycles'}</span>
          </button>

          {/* Folder tree */}
          {folderTree.length === 0 ? (
            <div className="px-2 py-4 text-center text-text-quaternary text-xs">
              No folders yet
            </div>
          ) : (
            folderTree.map(folder => (
              <FolderNode
                key={folder.id}
                folder={folder}
                depth={0}
                selectedFolderId={selectedFolderId}
                expandedIds={expandedIds || new Set()}
                onSelect={onSelectFolder}
                onToggleExpand={toggleExpanded}
                onCreateSubfolder={openCreateDialog}
                onRename={openRenameDialog}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              {createParentId ? 'Create Subfolder' : 'Create Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="bg-surface-2 border-border-default"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="bg-surface-2 border-border-default"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming}>
              {isRenaming && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Folder Node Component
interface FolderNodeProps {
  folder: TestFolder;
  depth: number;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onRename: (folder: TestFolder) => void;
  onDelete: (folder: TestFolder) => void;
}

function FolderNode({
  folder,
  depth,
  selectedFolderId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateSubfolder,
  onRename,
  onDelete,
}: FolderNodeProps) {
  const isExpanded = expandedIds.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded transition-colors',
          isSelected
            ? 'bg-accent-subtle text-accent-primary'
            : 'text-text-secondary hover:bg-surface-hover'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(folder.id);
          }}
          className={cn(
            'h-6 w-6 flex items-center justify-center shrink-0',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Folder button */}
        <button
          onClick={() => onSelect(folder.id)}
          className="flex-1 flex items-center gap-2 py-1.5 pr-1 min-w-0"
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-status-warning" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate text-sm">{folder.name}</span>
        </button>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
            <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!folder.is_system && (
              <DropdownMenuItem 
                onClick={() => onDelete(folder)}
                className="text-status-error focus:text-status-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TestFolderTree;
