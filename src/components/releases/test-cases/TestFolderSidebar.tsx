import React, { useState, useEffect } from 'react';
import { Plus, Folder, FolderOpen, ChevronRight, MoreHorizontal, Layers, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFolderTree } from '@/hooks/useFolders';
import { buildFolderTree, getDescendantFolderIds } from '@/types/test-folders';
import type { FolderTreeNode, TestFolderWithCount } from '@/types/test-folders';
import { CreateFolderDialog } from './CreateFolderDialog';
import { RenameFolderDialog } from './RenameFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { cn } from '@/lib/utils';

interface TestFolderSidebarProps {
  projectId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  totalTestCaseCount?: number;
}

export function TestFolderSidebar({
  projectId,
  selectedFolderId,
  onFolderSelect,
  totalTestCaseCount = 0,
}: TestFolderSidebarProps) {
  // Fetch folder tree
  const { data: folders = [], isLoading, error } = useFolderTree(projectId);
  
  // Local state for expanded folders
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  // Build tree structure
  const folderTree = buildFolderTree(folders, expandedIds);
  
  // Calculate total count from folders
  const folderTotalCount = folders.reduce((sum, f) => sum + f.count, 0);
  const displayTotalCount = totalTestCaseCount || folderTotalCount;

  // Auto-expand parent folders when a folder is selected
  useEffect(() => {
    if (selectedFolderId && folders.length > 0) {
      const newExpanded = new Set(expandedIds);
      let current = folders.find(f => f.id === selectedFolderId);
      while (current?.parentId) {
        newExpanded.add(current.parentId);
        current = folders.find(f => f.id === current!.parentId);
      }
      setExpandedIds(newExpanded);
    }
  }, [selectedFolderId, folders]);

  // Toggle folder expansion
  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedIds(newExpanded);
  };

  // Open create folder dialog
  const openCreateDialog = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setCreateDialogOpen(true);
  };

  // Open rename dialog
  const openRenameDialog = (folderId: string) => {
    setRenameFolderId(folderId);
    setRenameDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (folderId: string) => {
    setDeleteFolderId(folderId);
    setDeleteDialogOpen(true);
  };

  // Get folder count including descendants
  const getFolderTotalCount = (folderId: string): number => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return 0;
    const descendantIds = getDescendantFolderIds(folderId, folders);
    const descendantCount = descendantIds.reduce((sum, id) => {
      const f = folders.find(folder => folder.id === id);
      return sum + (f?.count || 0);
    }, 0);
    return folder.count + descendantCount;
  };

  // Handle drag over for drop target
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-primary/10', 'ring-2', 'ring-primary', 'ring-dashed');
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-primary/10', 'ring-2', 'ring-primary', 'ring-dashed');
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-primary/10', 'ring-2', 'ring-primary', 'ring-dashed');
    const testCaseId = e.dataTransfer.getData('text/plain');
    if (testCaseId) {
      window.dispatchEvent(new CustomEvent('moveTestCase', {
        detail: { testCaseId, folderId }
      }));
    }
  };

  // Render a folder tree item recursively
  const renderFolderItem = (node: FolderTreeNode, level: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const totalCount = getFolderTotalCount(node.id);

    return (
      <div key={node.id} role="treeitem" aria-selected={isSelected} aria-expanded={hasChildren ? isExpanded : undefined}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "group flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded-md cursor-pointer transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
              style={{ paddingLeft: `${8 + level * 16}px` }}
              onClick={() => onFolderSelect(node.id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, node.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFolderSelect(node.id);
                }
              }}
            >
              {/* Expand/Collapse Button */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>
              ) : (
                <div className="w-4" />
              )}

              {/* Folder Icon */}
              {isExpanded && hasChildren ? (
                <FolderOpen className="w-4 h-4 text-warning flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-warning flex-shrink-0" />
              )}

              {/* Folder Name */}
              <span className="flex-1 truncate text-xs font-medium">{node.name}</span>

              {/* Count Badge */}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {totalCount}
              </span>

              {/* More Options Dropdown Menu (visible on hover) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-all"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-50 bg-popover">
                  <DropdownMenuItem onClick={() => openCreateDialog(node.id)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add Subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openRenameDialog(node.id)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(node.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => openCreateDialog(node.id)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Subfolder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => openRenameDialog(node.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => openDeleteDialog(node.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Children (if expanded) */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get folder data for dialogs
  const getFolder = (id: string | null) => folders.find(f => f.id === id);
  const renameFolderData = renameFolderId ? getFolder(renameFolderId) : null;
  const deleteFolderData = deleteFolderId ? getFolder(deleteFolderId) : null;
  const createParentData = createParentId ? getFolder(createParentId) : null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Main Folder Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden flex-1 flex flex-col">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => openCreateDialog(null)}
            title="Create folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Folder Tree */}
        <div 
          className="flex-1 overflow-y-auto py-1"
          role="tree"
          aria-label="Test case folders"
        >
          {isLoading ? (
            <div className="space-y-1 px-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-[85%]" />
              <Skeleton className="h-7 w-[90%]" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-xs text-destructive mb-2">Failed to load folders</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* "All Test Cases" item */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-colors",
                  selectedFolderId === null
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
                onClick={() => onFolderSelect(null)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
                role="treeitem"
                aria-selected={selectedFolderId === null}
              >
                <Layers className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-xs font-medium">All Test Cases</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    selectedFolderId === null
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {displayTotalCount}
                </span>
              </div>

              {/* Separator */}
              <div className="mx-3 my-1.5 border-t border-border" />

              {/* Folder Tree */}
              {folderTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                  <Folder className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">No folders yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => openCreateDialog(null)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Folder
                  </Button>
                </div>
              ) : (
                folderTree.map(node => renderFolderItem(node, 0))
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Statistics
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Folders</span>
            <span className="font-medium">{folders.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">With Test Cases</span>
            <span className="font-medium text-success">
              {folders.filter(f => f.count > 0).length}
            </span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        parentFolderId={createParentId}
        parentFolderName={createParentData?.name}
      />

      {renameFolderData && (
        <RenameFolderDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          projectId={projectId}
          folderId={renameFolderData.id}
          currentName={renameFolderData.name}
        />
      )}

      {deleteFolderData && (
        <DeleteFolderDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          projectId={projectId}
          folderId={deleteFolderData.id}
          folderName={deleteFolderData.name}
          testCaseCount={getFolderTotalCount(deleteFolderData.id)}
        />
      )}
    </div>
  );
}
