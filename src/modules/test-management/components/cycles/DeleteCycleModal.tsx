/**
 * Delete Cycle Modal
 * Confirmation dialog for deleting test cycles
 */

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TestCycle } from '../../api/types';

interface DeleteCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: TestCycle | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteCycleModal({
  open,
  onOpenChange,
  cycle,
  onConfirm,
  isLoading,
}: DeleteCycleModalProps) {
  if (!cycle) return null;

  const hasExecutions = (cycle.statistics?.total_cases || 0) > 0;
  const executedCount = hasExecutions 
    ? (cycle.statistics?.passed_count || 0) + 
      (cycle.statistics?.failed_count || 0) + 
      (cycle.statistics?.blocked_count || 0)
    : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Test Cycle
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>"{cycle.title}"</strong> ({cycle.cycle_key})?
            </p>
            
            {hasExecutions && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-destructive mb-1">⚠️ Warning</p>
                <p className="text-muted-foreground">
                  This cycle contains <strong>{cycle.statistics?.total_cases}</strong> test cases 
                  with <strong>{executedCount}</strong> executed runs. 
                  All execution history will be permanently deleted.
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Cycle
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteCycleModal;
