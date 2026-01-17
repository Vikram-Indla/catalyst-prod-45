/**
 * Delete Confirm Modal
 * Confirmation dialog for deleting items - wired to Supabase
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Folder, FileText, ClipboardList } from 'lucide-react';
import { useDeleteFolder, useProjects } from '@/hooks/test-management';

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  itemType: 'folder' | 'suite' | 'test';
  childCount?: number;
}

export function DeleteConfirmModal({ 
  open, 
  onOpenChange, 
  itemId,
  itemName,
  itemType,
  childCount = 0
}: DeleteConfirmModalProps) {
  // Get current project
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;
  
  // Use real Supabase mutation for folders
  const deleteFolder = useDeleteFolder();

  const handleDelete = async () => {
    if (!projectId) return;

    if (itemType === 'folder') {
      deleteFolder.mutate(
        { id: itemId, project_id: projectId },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      // TODO: Wire suite/test deletion when those hooks are ready
      onOpenChange(false);
    }
  };

  const isDeleting = deleteFolder.isPending;

  const getIcon = () => {
    switch (itemType) {
      case 'folder':
        return <Folder className="w-5 h-5 text-amber-500" />;
      case 'suite':
        return <FileText className="w-5 h-5 text-primary" />;
      case 'test':
        return <ClipboardList className="w-5 h-5 text-primary" />;
    }
  };

  const getWarningMessage = () => {
    if (itemType === 'folder' && childCount > 0) {
      return `This folder contains ${childCount} item${childCount > 1 ? 's' : ''}. Contents will be moved to the parent folder.`;
    }
    if (itemType === 'suite' && childCount > 0) {
      return `This suite contains ${childCount} test case${childCount > 1 ? 's' : ''}. All test cases will be permanently deleted.`;
    }
    return 'This action cannot be undone.';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                {getIcon()}
                <span className="text-sm font-medium text-foreground truncate">{itemName}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {getWarningMessage()}
              </p>

              {childCount > 0 && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">
                    Warning: This will affect all nested content
                  </span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !projectId}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
