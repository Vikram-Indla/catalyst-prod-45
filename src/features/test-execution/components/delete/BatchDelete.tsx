/**
 * Module 3C-4: Batch Delete Wizard
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useBatchDelete } from '../../hooks/useBatchDelete';
import { DeleteStepIndicator } from './DeleteStepIndicator';
import { DeleteTypeSelector } from './DeleteTypeSelector';
import { DependencyWarning } from './DependencyWarning';
import { ConfirmationInput } from './ConfirmationInput';
import { DeleteProgress } from './DeleteProgress';
import { DeleteResults } from './DeleteResults';

interface BatchDeleteProps {
  projectId: string;
  selectedTestCaseIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BatchDelete({
  projectId,
  selectedTestCaseIds,
  open,
  onOpenChange,
  onComplete,
}: BatchDeleteProps) {
  const {
    currentStep,
    deleteType,
    confirmText,
    dependencies,
    progress,
    status,
    result,
    isLoading,
    setDeleteType,
    setConfirmText,
    checkDependencies,
    executeDelete,
    isConfirmValid,
    goToStep,
    reset,
    getSelectedCount,
  } = useBatchDelete(projectId, selectedTestCaseIds);

  const handleClose = () => {
    reset();
    onOpenChange(false);
    if (result?.success) {
      onComplete?.();
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      await checkDependencies();
    } else if (currentStep === 2) {
      await executeDelete();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      goToStep(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete {getSelectedCount()} Test Case{getSelectedCount() > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <DeleteStepIndicator currentStep={currentStep} />

        <div className="min-h-[300px]">
          {/* Step 1: Select Delete Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Choose how you want to delete the selected test cases.
              </p>
              <DeleteTypeSelector
                selected={deleteType}
                onSelect={setDeleteType}
              />
            </div>
          )}

          {/* Step 2: Confirm */}
          {currentStep === 2 && dependencies && (
            <div className="space-y-6">
              <DependencyWarning
                dependencies={dependencies}
                testCaseCount={getSelectedCount()}
              />
              <ConfirmationInput
                value={confirmText}
                onChange={setConfirmText}
                isValid={isConfirmValid()}
              />
            </div>
          )}

          {/* Step 3: Execute */}
          {currentStep === 3 && !result && (
            <DeleteProgress
              progress={progress}
              status={status}
              deleteType={deleteType}
              totalRecords={getSelectedCount()}
            />
          )}

          {/* Results */}
          {currentStep === 3 && result && (
            <DeleteResults
              result={result}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Actions */}
        {currentStep < 3 && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={isLoading}
            >
              {currentStep === 1 ? 'Cancel' : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleNext}
              disabled={isLoading || (currentStep === 2 && !isConfirmValid())}
            >
              {currentStep === 1 ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {getSelectedCount()} Items
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
