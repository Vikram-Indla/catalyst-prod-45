/**
 * Move Modal
 * Move items to a different folder
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderInput, Folder, FolderOpen, ChevronRight, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mockFolders } from '@/data/mockTestRepositoryData';
import { cn } from '@/lib/utils';

interface MoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  itemType: 'folder' | 'suite' | 'test';
  currentParentId?: string | null;
}

export function MoveModal({ 
  open, 
  onOpenChange, 
  itemId,
  itemName,
  itemType,
  currentParentId
}: MoveModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Get root folders
  const rootFolders = mockFolders.filter(f => f.parentId === null && f.id !== itemId);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const targetName = selectedFolderId 
      ? mockFolders.find(f => f.id === selectedFolderId)?.name || 'folder'
      : 'root';
    
    toast({
      title: 'Item moved',
      description: `"${itemName}" has been moved to ${targetName}.`,
    });
    
    setIsSubmitting(false);
    setSelectedFolderId(null);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedFolderId(null);
    }
    onOpenChange(open);
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

  const getChildFolders = (parentId: string) => {
    return mockFolders.filter(f => f.parentId === parentId && f.id !== itemId);
  };

  const renderFolder = (folder: typeof mockFolders[0], depth: number = 0) => {
    const children = getChildFolders(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isCurrent = folder.id === currentParentId;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1",
            "hover:bg-muted/50",
            isSelected && "bg-primary/10 border border-primary/30",
            isCurrent && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
        >
          {children.length > 0 ? (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform cursor-pointer",
                isExpanded && "rotate-90"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            />
          ) : (
            <div className="w-4" />
          )}
          
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          
          <span className="text-sm font-medium text-foreground flex-1 truncate">
            {folder.name}
          </span>
          
          {isCurrent && (
            <span className="text-[10px] text-muted-foreground">(current)</span>
          )}
        </div>
        
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="w-5 h-5 text-primary" />
            Move {itemType === 'folder' ? 'Folder' : itemType === 'suite' ? 'Suite' : 'Test'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select destination for <span className="font-medium text-foreground">"{itemName}"</span>
          </p>
          
          <ScrollArea className="h-[300px] border border-border rounded-lg">
            <div className="py-2">
              {/* Root option */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1",
                  "hover:bg-muted/50",
                  selectedFolderId === null && "bg-primary/10 border border-primary/30",
                  currentParentId === null && "opacity-50"
                )}
                onClick={() => currentParentId !== null && setSelectedFolderId(null)}
              >
                <Home className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Root (No folder)</span>
                {currentParentId === null && (
                  <span className="text-[10px] text-muted-foreground ml-auto">(current)</span>
                )}
              </div>
              
              {/* Folder tree */}
              {rootFolders.map(folder => renderFolder(folder))}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedFolderId === currentParentId)}
          >
            {isSubmitting ? 'Moving...' : 'Move Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
