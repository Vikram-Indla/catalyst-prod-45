import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Folder, Layers } from 'lucide-react';
import { useFolderTree, useMoveTestCases } from '@/hooks/useFolders';
import { buildFolderTree } from '@/types/test-folders';
import type { FolderTreeNode } from '@/types/test-folders';
import { cn } from '@/lib/utils';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedTestCaseIds: string[];
  onSuccess?: () => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  projectId,
  selectedTestCaseIds,
  onSuccess,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders = [] } = useFolderTree(projectId);
  const moveTestCases = useMoveTestCases(projectId);

  // Build folder tree (all expanded for selection)
  const allExpandedIds = new Set(folders.map(f => f.id));
  const folderTree = buildFolderTree(folders, allExpandedIds);

  const handleMove = async () => {
    try {
      await moveTestCases.mutateAsync({
        testCaseIds: selectedTestCaseIds,
        folderId: selectedFolderId,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Render folder option recursively
  const renderFolderOption = (node: FolderTreeNode, level: number = 0) => (
    <div key={node.id}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors",
          selectedFolderId === node.id && "bg-primary/10"
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={() => setSelectedFolderId(node.id)}
      >
        <RadioGroupItem value={node.id} id={`folder-${node.id}`} />
        <Folder className="w-4 h-4 text-warning" />
        <Label
          htmlFor={`folder-${node.id}`}
          className="flex-1 cursor-pointer text-sm"
        >
          {node.name}
        </Label>
      </div>
      {node.children.map(child => renderFolderOption(child, level + 1))}
    </div>
  );

  const isMoving = moveTestCases.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Select destination for {selectedTestCaseIds.length} test case(s)
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedFolderId || 'unassigned'}
          onValueChange={(value) => setSelectedFolderId(value === 'unassigned' ? null : value)}
          className="border border-border rounded-md max-h-64 overflow-y-auto"
        >
          {/* Unassigned option */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors border-b border-border",
              selectedFolderId === null && "bg-primary/10"
            )}
            onClick={() => setSelectedFolderId(null)}
          >
            <RadioGroupItem value="unassigned" id="folder-unassigned" />
            <Layers className="w-4 h-4 text-primary" />
            <Label
              htmlFor="folder-unassigned"
              className="flex-1 cursor-pointer text-sm"
            >
              Unassigned
            </Label>
          </div>

          {/* Folder options */}
          {folderTree.map(node => renderFolderOption(node, 0))}
        </RadioGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
