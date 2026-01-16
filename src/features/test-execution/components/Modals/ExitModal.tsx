/**
 * ExitModal - Confirmation dialog for exiting execution
 */

import { Button } from '@/components/ui/button';
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

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  completedSteps: number;
  totalSteps: number;
}

export function ExitModal({
  isOpen,
  onClose,
  onConfirm,
  completedSteps,
  totalSteps,
}: ExitModalProps) {
  const hasProgress = completedSteps > 0;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit Test Execution?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasProgress ? (
              <>
                You've completed {completedSteps} of {totalSteps} steps.
                Your progress will be saved and you can resume later.
              </>
            ) : (
              <>
                Are you sure you want to exit? No steps have been completed yet.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Testing</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {hasProgress ? 'Save & Exit' : 'Exit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
