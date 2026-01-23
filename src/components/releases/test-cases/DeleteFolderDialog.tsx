import React from 'react';
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
import { AlertTriangle } from 'lucide-react';
import { useDeleteFolder } from '@/hooks/useFolders';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId: string;
  folderName: string;
  testCaseCount: number;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  folderName,
  testCaseCount,
}: DeleteFolderDialogProps) {
  const deleteFolder = useDeleteFolder(projectId);

  const handleDelete = async () => {
    try {
      await deleteFolder.mutateAsync(folderId);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isDeleting = deleteFolder.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>Delete "{folderName}"?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {testCaseCount > 0 ? (
                  <>
                    This folder contains <strong>{testCaseCount} test case(s)</strong>.
                    They will become unassigned.
                  </>
                ) : (
                  'This folder is empty and will be permanently deleted.'
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
