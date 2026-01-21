/**
 * Module 4C-1: Add Cases to Run Dialog
 */

import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TestCaseSelector } from './TestCaseSelector';
import { useAssignCasesToRun } from '../../hooks/useRunAssignments';

interface AddCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  projectId: string;
  existingCaseIds: string[];
  onSuccess?: () => void;
}

export function AddCasesDialog({
  open,
  onOpenChange,
  runId,
  projectId,
  existingCaseIds,
  onSuccess,
}: AddCasesDialogProps) {
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const assignCases = useAssignCasesToRun();

  const handleSubmit = async () => {
    if (selectedCaseIds.length === 0) return;

    try {
      await assignCases.mutateAsync({
        runId,
        caseIds: selectedCaseIds,
      });
      setSelectedCaseIds([]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedCaseIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Test Cases to Run
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <TestCaseSelector
            projectId={projectId}
            selectedCaseIds={selectedCaseIds}
            onSelectionChange={setSelectedCaseIds}
            excludeCaseIds={existingCaseIds}
            maxHeight="350px"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={assignCases.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCaseIds.length === 0 || assignCases.isPending}
          >
            {assignCases.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selectedCaseIds.length > 0 ? `${selectedCaseIds.length} Case(s)` : 'Cases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
