/**
 * Folder Tree Component
 * Hierarchical folder navigation with context menu, drag-drop, and keyboard shortcuts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  FileText,
  Copy,
  FolderInput,
  MoreHorizontal,
  PanelLeftClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Folder as FolderType } from '../../api/types';

// Folder colors
const FOLDER_COLORS = [
  { value: 'default', label: 'Default', class: 'text-yellow-500' },
  { value: 'blue', label: 'Blue', class: 'text-blue-500' },
  { value: 'green', label: 'Green', class: 'text-green-500' },
  { value: 'red', label: 'Red', class: 'text-red-500' },
  { value: 'purple', label: 'Purple', class: 'text-purple-500' },
  { value: 'orange', label: 'Orange', class: 'text-orange-500' },
] as const;

function getFolderColorClass(color?: string): string {
  const found = FOLDER_COLORS.find(c => c.value === color);
  return found?.class || 'text-yellow-500';
}

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null, name: string, description?: string, color?: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  onDuplicateFolder?: (folderId: string) => void;
  totalCaseCount?: number;
  isLoading?: boolean;
  onCollapse?: () => void;
}

interface FolderItemProps {
  folder: FolderType;
  level: number;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  allFolders: FolderType[];
  isRenaming: boolean;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onRename: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onCreateSubfolder: (parentId: string) => void;
  onStartRename: (folderId: string) => void;
  onFinishRename: (folderId: string, newName: string) => void;
  onCancelRename: () => void;
  onDuplicate?: (folder: FolderType) => void;
  onMoveTo?: (folderId: string, newParentId: string | null) => void;
}

// Flatten folder tree for move targets
function flattenFolders(folders: FolderType[]): FolderType[] {
  const result: FolderType[] = [];
  const flatten = (list: FolderType[]) => {
    list.forEach(f => {
      result.push(f);
      if (f.children) flatten(f.children);
    });
  };
  flatten(folders);
  return result;
}

// Get all descendant IDs of a folder
function getDescendantIds(folder: FolderType): Set<string> {
  const ids = new Set<string>();
  const collect = (f: FolderType) => {
    ids.add(f.id);
    f.children?.forEach(collect);
  };
  collect(folder);
  return ids;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  allFolders,
  isRenaming,
  onToggleExpand,
  onSelectFolder,
  onRename,
  onDelete,
  onCreateSubfolder,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onDuplicate,
  onMoveTo,
}: FolderItemProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState(folder.name);

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Reset local name when folder changes
  useEffect(() => {
    setLocalName(folder.name);
  }, [folder.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishRename(folder.id, localName);
    } else if (e.key === 'Escape') {
      setLocalName(folder.name);
      onCancelRename();
    }
  };

  // Get valid move targets (exclude self and descendants)
  const excludeIds = getDescendantIds(folder);
  const validMoveTargets = flattenFolders(allFolders).filter(f => !excludeIds.has(f.id));

  const colorClass = getFolderColorClass((folder as any).color);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={() => !isRenaming && onSelectFolder(folder.id)}
            onDoubleClick={() => onStartRename(folder.id)}
            className={cn(
              'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors group cursor-pointer',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            {hasChildren ? (
              <span
                role="button"
                aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
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
              </span>
            ) : (
              <span className="w-4" />
            )}
            {isExpanded && hasChildren ? (
              <FolderOpen className={cn("h-4 w-4 shrink-0", colorClass)} />
            ) : (
              <Folder className={cn("h-4 w-4 shrink-0", colorClass)} />
            )}
            
            {isRenaming ? (
              <input
                ref={inputRef}
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => onFinishRename(folder.id, localName)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0.5 text-sm bg-background border border-primary rounded outline-none text-foreground"
              />
            ) : (
              <span className="flex-1 truncate text-left">{folder.name}</span>
            )}
            
            {folder.case_count !== undefined && folder.case_count > 0 && !isRenaming && (
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
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => onCreateSubfolder(folder.id)}>
            <Plus className="h-4 w-4 mr-2" />
            New Subfolder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onStartRename(folder.id)}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
            <span className="ml-auto text-xs text-muted-foreground">F2</span>
          </ContextMenuItem>
          {onDuplicate && (
            <ContextMenuItem onClick={() => onDuplicate(folder)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </ContextMenuItem>
          )}
          {onMoveTo && validMoveTargets.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to...
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                <ContextMenuItem onClick={() => onMoveTo(folder.id, null)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Root (No parent)
                </ContextMenuItem>
                <ContextMenuSeparator />
                {validMoveTargets.map(target => (
                  <ContextMenuItem 
                    key={target.id} 
                    onClick={() => onMoveTo(folder.id, target.id)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    {target.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(folder)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
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
              allFolders={allFolders}
              isRenaming={isRenaming}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              onCancelRename={onCancelRename}
              onDuplicate={onDuplicate}
              onMoveTo={onMoveTo}
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
  onMoveFolder,
  onDuplicateFolder,
  totalCaseCount = 0,
  isLoading,
  onCollapse,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('default');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const didInitExpand = useRef(false);

  // Flatten folders for reference
  const allFolders = flattenFolders(folders);

  // Auto-expand top-level parents so subfolders are visibly nested by default.
  // Only runs once per mount to avoid overriding user expand/collapse choices.
  useEffect(() => {
    if (didInitExpand.current) return;
    didInitExpand.current = true;

    const parentsWithChildren = folders
      .filter((f) => (f as any).children && (f as any).children.length > 0)
      .map((f) => f.id);

    if (parentsWithChildren.length > 0) {
      setExpandedFolders(new Set(parentsWithChildren));
    }
  }, [folders]);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(createParentId, newFolderName.trim(), newFolderDescription.trim() || undefined, newFolderColor);
      resetCreateForm();
      setCreateDialogOpen(false);
      // Expand parent if creating subfolder
      if (createParentId) {
        setExpandedFolders(prev => new Set([...prev, createParentId]));
      }
    }
  };

  const resetCreateForm = () => {
    setNewFolderName('');
    setNewFolderDescription('');
    setNewFolderColor('default');
    setCreateParentId(null);
  };

  const handleFinishRename = (folderId: string, newName: string) => {
    if (newName.trim()) {
      onRenameFolder(folderId, newName.trim());
    }
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = () => {
    if (folderToDelete) {
      onDeleteFolder(folderToDelete.id);
      if (selectedFolderId === folderToDelete.id) {
        onSelectFolder(null);
      }
      setDeleteDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  const openCreateDialog = (parentId: string | null = null) => {
    resetCreateForm();
    setCreateParentId(parentId);
    setCreateDialogOpen(true);
  };

  const openDeleteDialog = (folder: FolderType) => {
    setFolderToDelete(folder);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = (folder: FolderType) => {
    onDuplicateFolder?.(folder.id);
  };

  const handleMoveTo = (folderId: string, newParentId: string | null) => {
    onMoveFolder?.(folderId, newParentId);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have a selected folder and not currently in an input
      if (!selectedFolderId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // F2 = Rename
      if (e.key === 'F2') {
        e.preventDefault();
        setRenamingFolderId(selectedFolderId);
      }

      // Delete = Delete folder
      if (e.key === 'Delete') {
        e.preventDefault();
        const folder = allFolders.find(f => f.id === selectedFolderId);
        if (folder) openDeleteDialog(folder);
      }

      // Ctrl+Shift+N = New subfolder
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        openCreateDialog(selectedFolderId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFolderId, allFolders]);

  // Get parent folder name for dialog
  const parentFolder = createParentId ? allFolders.find(f => f.id === createParentId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 gap-1"
        style={{
          height: '52px',
          borderBottom: '1px solid var(--divider, hsl(var(--border)))',
        }}
      >
        <div className="flex items-center gap-1">
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCollapse}
              title="Collapse folders panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-semibold text-sm">Folders</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => openCreateDialog(null)}
          title="Create folder"
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

          {/* Empty state */}
          {!isLoading && folders.length === 0 && (
            <div className="py-8 px-2 text-center">
              <Folder className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-2">No folders yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => openCreateDialog(null)}
                className="text-primary"
              >
                Create your first folder
              </Button>
            </div>
          )}

          {/* Folder Tree */}
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              allFolders={allFolders}
              isRenaming={renamingFolderId === folder.id}
              onToggleExpand={handleToggleExpand}
              onSelectFolder={onSelectFolder}
              onRename={() => setRenamingFolderId(folder.id)}
              onDelete={openDeleteDialog}
              onCreateSubfolder={(parentId) => openCreateDialog(parentId)}
              onStartRename={setRenamingFolderId}
              onFinishRename={handleFinishRename}
              onCancelRename={() => setRenamingFolderId(null)}
              onDuplicate={onDuplicateFolder ? handleDuplicate : undefined}
              onMoveTo={onMoveFolder ? handleMoveTo : undefined}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            {parentFolder && (
              <DialogDescription>
                Creating subfolder in: <span className="font-medium">{parentFolder.name}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Folder Name *</Label>
                <Input
                  id="folder-name"
                  placeholder="e.g., Authentication Tests"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder-description">Description</Label>
                <Textarea
                  id="folder-description"
                  placeholder="Optional description for this folder..."
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Folder Color</Label>
                <Select value={newFolderColor} onValueChange={setNewFolderColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDER_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <Folder className={cn("h-4 w-4", c.class)} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newFolderName.trim()}>
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Are you sure you want to delete "<span className="font-medium text-foreground">{folderToDelete?.name}</span>"?
            </p>
            {((folderToDelete?.case_count ?? 0) > 0 || (folderToDelete?.children?.length ?? 0) > 0) && (
              <div className="text-sm bg-warning/10 border border-warning/30 rounded-md p-3 space-y-1">
                <p className="font-medium text-warning">This folder contains:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {(folderToDelete?.case_count ?? 0) > 0 && (
                    <li>{folderToDelete?.case_count} test case(s)</li>
                  )}
                  {(folderToDelete?.children?.length ?? 0) > 0 && (
                    <li>{folderToDelete?.children?.length} subfolder(s)</li>
                  )}
                </ul>
                <p className="text-muted-foreground mt-2">
                  All contents will be moved to the parent folder.
                </p>
              </div>
            )}
          </div>
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
