import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
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

interface DeleteSharedStepModalProps {
  isOpen: boolean;
  sharedStep: { id: string; name: string; usage_count: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteSharedStepModal({ isOpen, sharedStep, onClose, onSuccess }: DeleteSharedStepModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!sharedStep) return;
    setIsDeleting(true);
    try {
      // 1. Remove orphaned test steps referencing this shared step (C-06 fix)
      await supabase
        .from('tm_test_steps' as any)
        .delete()
        .eq('shared_step_id', sharedStep.id)
        .eq('is_shared', true);

      // 2. Delete shared step usage records
      await typedQuery('th_shared_step_usage').delete().eq('shared_step_id', sharedStep.id);
      
      // 3. Delete the shared step itself
      const { error } = await typedQuery('tm_shared_steps').delete().eq('id', sharedStep.id) as any;
      if (error) {
        catalystToast.error(error.message || 'Failed to delete', { title: 'Delete Failed' });
        return;
      }
      catalystToast.success('Shared step deleted successfully', { title: 'Deleted' });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to delete', { title: 'Delete Failed' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!sharedStep) return null;
  const hasUsage = sharedStep.usage_count > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Shared Step
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex items-start gap-4 pt-2">
              <div className="p-2 bg-destructive/10 rounded-full flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">
                  Are you sure you want to delete &quot;{sharedStep.name}&quot;?
                </p>
                <p className="text-muted-foreground">
                  This action cannot be undone. The shared step will be permanently removed from the library.
                </p>
                {hasUsage && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">
                        This step is used in {sharedStep.usage_count} test case{sharedStep.usage_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs mt-1 opacity-80">
                        Deleting it will remove the step reference from those test cases.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete Step'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
