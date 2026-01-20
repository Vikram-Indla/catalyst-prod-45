/**
 * Module 3A-2: Completion Dialog
 * Shows summary when test execution is complete
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
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ExecutionProgress, ExecutionResult } from '../../types/step-execution';

interface CompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ExecutionResult) => void;
  progress: ExecutionProgress;
  isSubmitting?: boolean;
}

export function CompletionDialog({
  isOpen,
  onClose,
  onComplete,
  progress,
  isSubmitting = false,
}: CompletionDialogProps) {
  // Determine suggested result based on step outcomes
  const getSuggestedResult = (): ExecutionResult => {
    if (progress.blocked > 0) return 'blocked';
    if (progress.failed > 0) return 'failed';
    return 'passed';
  };

  const suggestedResult = getSuggestedResult();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-primary" />
            Complete Test Execution
          </AlertDialogTitle>
          <AlertDialogDescription>
            All steps have been executed. Review the summary and confirm the overall result.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{progress.passed}</div>
            <div className="text-xs text-green-600">Passed</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{progress.blocked}</div>
            <div className="text-xs text-amber-600">Blocked</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-500">{progress.skipped}</div>
            <div className="text-xs text-gray-500">Skipped</div>
          </div>
        </div>

        {/* Suggested Result */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Suggested overall result:</p>
          <Badge
            className={`text-sm ${
              suggestedResult === 'passed' ? 'bg-green-600' :
              suggestedResult === 'failed' ? 'bg-red-600' :
              'bg-amber-600'
            }`}
          >
            {suggestedResult === 'passed' && <CheckCircle2 className="h-4 w-4 mr-1" />}
            {suggestedResult === 'failed' && <XCircle className="h-4 w-4 mr-1" />}
            {suggestedResult === 'blocked' && <AlertTriangle className="h-4 w-4 mr-1" />}
            {suggestedResult.charAt(0).toUpperCase() + suggestedResult.slice(1)}
          </Badge>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isSubmitting}>
            Continue Testing
          </AlertDialogCancel>
          <div className="flex gap-2">
            {suggestedResult !== 'passed' && (
              <AlertDialogAction
                onClick={() => onComplete('passed')}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Pass
              </AlertDialogAction>
            )}
            {suggestedResult !== 'failed' && (
              <AlertDialogAction
                onClick={() => onComplete('failed')}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Fail
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => onComplete(suggestedResult)}
              disabled={isSubmitting}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Complete as {suggestedResult.charAt(0).toUpperCase() + suggestedResult.slice(1)}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
