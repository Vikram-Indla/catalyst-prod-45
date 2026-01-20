/**
 * Module 3A-2: Exit Dialog
 * Confirms exit with progress save option
 */
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
import { LogOut, Save, X } from 'lucide-react';
import type { ExecutionProgress } from '../../types/step-execution';

interface ExitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
  onSaveAndExit: () => void;
  progress: ExecutionProgress;
  hasUnsavedChanges?: boolean;
}

export function ExitDialog({
  isOpen,
  onClose,
  onExit,
  onSaveAndExit,
  progress,
  hasUnsavedChanges = false,
}: ExitDialogProps) {
  const remainingSteps = progress.total - progress.completed;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-amber-500" />
            Exit Test Execution?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {remainingSteps > 0 ? (
              <>
                You have <strong>{remainingSteps} step{remainingSteps !== 1 ? 's' : ''}</strong> remaining.
                Your progress will be saved and you can continue later.
              </>
            ) : (
              'All steps are complete. You can finish the execution or exit without marking it complete.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Progress Summary */}
        <div className="py-3 px-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-2">Current Progress</div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600">✓ {progress.passed} passed</span>
            <span className="text-red-600">✕ {progress.failed} failed</span>
            <span className="text-amber-600">⊘ {progress.blocked} blocked</span>
            <span className="text-gray-500">→ {progress.skipped} skipped</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {progress.completed} of {progress.total} steps completed ({progress.percentage}%)
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <X className="h-4 w-4 mr-1" />
            Continue Testing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSaveAndExit}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Save className="h-4 w-4 mr-1" />
            Save & Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
