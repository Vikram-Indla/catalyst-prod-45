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
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { TestSet } from '@/types/test-sets';

interface RefreshConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testSet: TestSet;
  isLoading?: boolean;
}

export function RefreshConfirmDialog({
  open,
  onClose,
  onConfirm,
  testSet,
  isLoading,
}: RefreshConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Refresh Dynamic Test Set
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will refresh <strong>{testSet.name}</strong> based on its criteria:
              </p>

              {testSet.dynamic_criteria && (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  {(testSet.dynamic_criteria.priority?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium">Priority:</span>{' '}
                      {testSet.dynamic_criteria.priority?.join(', ')}
                    </p>
                  )}
                  {(testSet.dynamic_criteria.tags?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium">Tags:</span>{' '}
                      {testSet.dynamic_criteria.tags?.join(', ')}
                    </p>
                  )}
                  {testSet.dynamic_criteria.folder_id && (
                    <p>
                      <span className="font-medium">Folder:</span> Filtered
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  This will replace all current test cases in this set with test cases matching the criteria.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Now
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
