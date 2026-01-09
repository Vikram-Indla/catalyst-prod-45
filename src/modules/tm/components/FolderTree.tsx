/**
 * Folder Tree - Phase 1 Spec Compliant
 * 280px width repo panel, 36px item height
 * Context menu for CRUD, expand/collapse
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import type { TMFolderNode } from '../types';

interface FolderTreeProps {
  folders: TMFolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  totalCaseCount: number;
  isLoading?: boolean;
}

interface FolderItemProps {
  folder: TMFolderNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (folder: TMFolderNode) => void;
  onDelete: (folder: TMFolderNode) => void;
  onAddSubfolder: (parentId: string) => void;
}

function FolderItem({
  folder,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onAddSubfolder,
}: FolderItemProps) {
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onSelect(folder.id)}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md transition-colors group',
              isSelected
                ? 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]'
                : 'text-[var(--text-2)] hover:bg-[var(--row-hover)] hover:text-[var(--text-1)]'
            )}
            style={{
              height: '36px',
              paddingLeft: `${12 + level * 16}px`,
              paddingRight: '12px',
            }}
          >
            {/* Chevron */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(folder.id);
                }}
                className="p-0.5 rounded hover:bg-black/10"
              >
                {isExpanded ? (
                  <ChevronDown style={{ width: '14px', height: '14px' }} />
                ) : (
                  <ChevronRight 
                    style={{ 
                      width: '14px', 
                      height: '14px',
                      transform: 'rotate(0deg)',
                      transition: 'transform 150ms'
                    }} 
                  />
                )}
              </button>
            ) : (
              <span style={{ width: '18px' }} />
            )}

            {/* Folder Icon */}
            {isExpanded ? (
              <FolderOpen style={{ width: '16px', height: '16px' }} className="shrink-0" />
            ) : (
              <Folder style={{ width: '16px', height: '16px' }} className="shrink-0" />
            )}

            {/* Name */}
            <span className="flex-1 truncate text-left text-sm">{folder.name}</span>

            {/* Count Badge */}
            {folder.testCaseCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 min-w-[20px] px-1.5 text-[10px] font-medium',
                  isSelected
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[var(--bg-2)] text-[var(--text-3)]'
                )}
                style={{ borderRadius: '10px' }}
              >
                {folder.testCaseCount}
              </Badge>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onAddSubfolder(folder.id)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Subfolder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(folder)}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(folder)}
            className="text-[#dc2626] focus:text-[#dc2626]"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onAddSubfolder={onAddSubfolder}
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
  totalCaseCount,
  isLoading,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<TMFolderNode | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<TMFolderNode | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const openCreateDialog = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), createParentId);
      setNewFolderName('');
      setCreateOpen(false);
    }
  };

  const openRenameDialog = (folder: TMFolderNode) => {
    setFolderToRename(folder);
    setNewFolderName(folder.name);
    setRenameOpen(true);
  };

  const handleRename = () => {
    if (folderToRename && newFolderName.trim()) {
      onRenameFolder(folderToRename.id, newFolderName.trim());
      setNewFolderName('');
      setRenameOpen(false);
      setFolderToRename(null);
    }
  };

  const openDeleteDialog = (folder: TMFolderNode) => {
    setFolderToDelete(folder);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (folderToDelete) {
      onDeleteFolder(folderToDelete.id);
      setDeleteOpen(false);
      setFolderToDelete(null);
    }
  };

  return (
    <div
      className="flex flex-col h-full border-r bg-[var(--bg-0)]"
      style={{ width: '280px', minWidth: '280px', borderColor: 'var(--stroke-1)' }}
    >
      {/* Header - 52px height */}
      <div
        className="flex items-center justify-between px-3"
        style={{
          height: '52px',
          borderBottom: '1px solid var(--stroke-1)',
        }}
      >
        <span
          className="font-semibold text-[var(--text-1)]"
          style={{ fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
        >
          REPOSITORY
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-3)] hover:text-[var(--text-1)]"
            onClick={handleCollapseAll}
            title="Collapse All"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-3)] hover:text-[var(--text-1)]"
            onClick={() => openCreateDialog(null)}
            title="New Folder"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folder List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* All Test Cases */}
          <button
            onClick={() => onSelectFolder(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md transition-colors',
              selectedFolderId === null
                ? 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]'
                : 'text-[var(--text-2)] hover:bg-[var(--row-hover)] hover:text-[var(--text-1)]'
            )}
            style={{ height: '36px', padding: '0 12px' }}
          >
            <FileText style={{ width: '16px', height: '16px' }} />
            <span className="flex-1 text-left text-sm">All Test Cases</span>
            {totalCaseCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 min-w-[20px] px-1.5 text-[10px] font-medium',
                  selectedFolderId === null
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[var(--bg-2)] text-[var(--text-3)]'
                )}
                style={{ borderRadius: '10px' }}
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
              selectedId={selectedFolderId}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onSelect={onSelectFolder}
              onRename={openRenameDialog}
              onDelete={openDeleteDialog}
              onAddSubfolder={(parentId) => openCreateDialog(parentId)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Create Folder Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent style={{ borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newFolderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog - Custom AlertDialog (NOT native confirm) */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent style={{ borderRadius: '12px' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"?
              {folderToDelete && folderToDelete.testCaseCount > 0 && (
                <span className="block mt-2 font-medium">
                  {folderToDelete.testCaseCount} test case(s) will be moved to parent folder.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FolderTree;
