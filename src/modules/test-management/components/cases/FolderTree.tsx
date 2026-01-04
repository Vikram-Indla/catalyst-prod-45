/**
 * Folder Tree Component
 * Hierarchical folder navigation with context menu and drag-drop
 */

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderInput,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Folder as FolderType } from '../../api/types';

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  totalCaseCount?: number;
  isLoading?: boolean;
}

interface FolderItemProps {
  folder: FolderType;
  level: number;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onRename: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onCreateSubfolder: (parentId: string) => void;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelectFolder,
  onRename,
  onDelete,
  onCreateSubfolder,
}: FolderItemProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors group',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.id);
                }}
                className="p-0.5 hover:bg-black/10 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )}
            <span className="flex-1 truncate text-left">{folder.name}</span>
            {folder.case_count !== undefined && folder.case_count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] h-5 min-w-[20px] px-1.5',
                  isSelected && 'bg-primary-foreground/20 text-primary-foreground'
                )}
              >
                {folder.case_count}
              </Badge>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onCreateSubfolder(folder.id)}>
            <Plus className="h-4 w-4 mr-2" />
            New Subfolder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(folder)}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(folder)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  totalCaseCount = 0,
  isLoading,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FolderType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(createParentId, newFolderName.trim());
      setNewFolderName('');
      setCreateDialogOpen(false);
    }
  };

  const handleRenameFolder = () => {
    if (folderToRename && newFolderName.trim()) {
      onRenameFolder(folderToRename.id, newFolderName.trim());
      setNewFolderName('');
      setRenameDialogOpen(false);
      setFolderToRename(null);
    }
  };

  const handleDeleteFolder = () => {
    if (folderToDelete) {
      onDeleteFolder(folderToDelete.id);
      setDeleteDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  const openCreateDialog = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
  };

  const openRenameDialog = (folder: FolderType) => {
    setFolderToRename(folder);
    setNewFolderName(folder.name);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (folder: FolderType) => {
    setFolderToDelete(folder);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 52px aligned with main content header */}
      <div
        className="flex items-center justify-between px-3"
        style={{
          height: '52px',
          borderBottom: '1px solid var(--divider, hsl(var(--border)))',
        }}
      >
        <h3 className="font-semibold text-sm">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => openCreateDialog(null)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Folder List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* All Cases */}
          <button
            onClick={() => onSelectFolder(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              selectedFolderId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 text-left">All Test Cases</span>
            {totalCaseCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] h-5 min-w-[20px] px-1.5',
                  selectedFolderId === null && 'bg-primary-foreground/20 text-primary-foreground'
                )}
              >
                {totalCaseCount}
              </Badge>
            )}
          </button>

          {/* Folder Tree */}
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleExpand}
              onSelectFolder={onSelectFolder}
              onRename={openRenameDialog}
              onDelete={openDeleteDialog}
              onCreateSubfolder={(parentId) => openCreateDialog(parentId)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!newFolderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete "{folderToDelete?.name}"? Test cases in this folder
            will be moved to the root level.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FolderTree;
