/**
 * TestHub Folder Tree Component
 * Displays hierarchical folder structure with counts and context menu actions
 */

import { useState, useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TMFolder } from '@/types/test-management';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';

interface TestHubFolderTreeProps {
  folders: TMFolder[];
  selectedFolderId: string | null;
  folderCounts: Record<string, number>;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

interface FolderNode extends TMFolder {
  children: FolderNode[];
}

function buildTree(folders: TMFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Create nodes
  folders.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] });
  });

  // Build tree structure
  folders.forEach(folder => {
    const node = map.get(folder.id)!;
    if (folder.parent_id && map.has(folder.parent_id)) {
      map.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  folderCounts: Record<string, number>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (parentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  folderCounts,
  expandedIds,
  onToggleExpand,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const count = folderCounts[folder.id] || 0;

  const handleRenameSubmit = () => {
    if (renameName.trim() && renameName !== folder.name) {
      onRenameFolder(folder.id, renameName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameName(folder.name);
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary border-l-2 border-primary'
            : 'hover:bg-muted/50 text-text-secondary hover:text-text-primary'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {/* Expand/collapse chevron */}
        <button
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-transform',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5', isExpanded && 'rotate-90')}
          />
        </button>

        {/* Folder icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-warning" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-warning" />
        )}

        {/* Folder name or rename input */}
        {isRenaming ? (
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            className="h-6 text-sm flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}

        {/* Count badge */}
        {count > 0 && !isRenaming && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            {count}
          </span>
        )}

        {/* Context menu */}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setRenameName(folder.name);
                setIsRenaming(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              folderCounts={folderCounts}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folder.name}"? 
              Test cases in this folder will be moved to the parent folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDeleteFolder(folder.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TestHubFolderTree({
  folders,
  selectedFolderId,
  folderCounts,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: TestHubFolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure from flat folders list
  const tree = useMemo(() => buildTree(folders), [folders]);

  // Calculate total unfiled count
  const unfiledCount = useMemo(() => {
    const folderedCount = Object.values(folderCounts).reduce((a, b) => a + b, 0);
    // This could be improved by passing total count from parent
    return 0;
  }, [folderCounts]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {/* All Test Cases */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
          selectedFolderId === null
            ? 'bg-primary/10 text-primary border-l-2 border-primary'
            : 'hover:bg-muted/50 text-text-secondary hover:text-text-primary'
        )}
        onClick={() => onSelect(null)}
      >
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">All Test Cases</span>
      </div>

      {/* Folder tree */}
      {tree.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          folderCounts={folderCounts}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      ))}

      {/* Empty state */}
      {tree.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No folders yet</p>
          <Button
            variant="link"
            size="sm"
            className="mt-1"
            onClick={() => onCreateFolder()}
          >
            Create first folder
          </Button>
        </div>
      )}
    </div>
  );
}
