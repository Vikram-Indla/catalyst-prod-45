/**
 * Move Folder Modal - Per T1 Folder Management spec
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { moveFolder, getFolders } from '@/services/folderService';
import type { FolderNode, EntityType } from '@/types/folder';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderNode;
  entityType: EntityType;
  programId: string;
  onSuccess: () => void;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  entityType,
  programId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      setSelectedFolderId(null);
    }
  }, [isOpen, entityType, programId]);

  const loadFolders = async () => {
    setIsFetching(true);
    try {
      const data = await getFolders(programId, entityType);
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const isDescendant = (parentId: string, checkId: string): boolean => {
    const findFolder = (nodes: FolderNode[]): FolderNode | undefined => {
      for (const node of nodes) {
        if (node.id === parentId) return node;
        const found = findFolder(node.children);
        if (found) return found;
      }
      return undefined;
    };

    const checkDescendants = (node: FolderNode): boolean => {
      if (node.id === checkId) return true;
      return node.children.some(child => checkDescendants(child));
    };

    const parentNode = findFolder(folders);
    return parentNode ? checkDescendants(parentNode) : false;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await moveFolder(folder.id, selectedFolderId);
      toast({
        title: 'Folder moved',
        description: `"${folder.name}" has been moved successfully`
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Error moving folder',
        description: err.message || 'Failed to move folder',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFolderTree = (nodes: FolderNode[], level: number = 0): React.ReactNode => {
    return nodes.map(node => {
      const isCurrentFolder = node.id === folder.id;
      const isDescendantOfCurrent = isDescendant(folder.id, node.id);
      const isDisabled = isCurrentFolder || isDescendantOfCurrent || node.is_system;
      const isExpanded = expandedFolders.has(node.id);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedFolderId === node.id;

      return (
        <div key={node.id}>
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
              isDisabled && 'opacity-50 cursor-not-allowed',
              isSelected && 'bg-brand-gold/20 border border-brand-gold',
              !isDisabled && !isSelected && 'hover:bg-muted'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => !isDisabled && setSelectedFolderId(node.id)}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-brand-gold" />
            ) : (
              <Folder className="h-4 w-4 text-brand-gold" />
            )}
            <span className="text-sm truncate flex-1">{node.name}</span>
          </div>
          {isExpanded && hasChildren && renderFolderTree(node.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Folder</DialogTitle>
          <DialogDescription>
            Select a destination for "{folder.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Root option */}
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
              selectedFolderId === null && 'bg-brand-gold/20 border border-brand-gold',
              selectedFolderId !== null && 'hover:bg-muted'
            )}
            onClick={() => setSelectedFolderId(null)}
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Root (No Parent)</span>
          </div>

          <ScrollArea className="h-64 border rounded-md p-2">
            {isFetching ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading folders...
              </div>
            ) : (
              renderFolderTree(folders)
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
            disabled={isLoading}
          >
            {isLoading ? 'Moving...' : 'Move Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
