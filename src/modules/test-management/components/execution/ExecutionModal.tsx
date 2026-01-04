/**
 * Execution Modal
 * Modal for executing test steps
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bug,
} from 'lucide-react';
import { useTestRun, useCreateRun, useUpdateStepResult, useCompleteRun } from '../../hooks/useExecution';
import type { ExecutionStatus, StepResult } from '../../api/types';

interface ExecutionModalProps {
  scopeId: string;
  runId?: string;
  onClose: () => void;
}

const STATUS_CONFIG: Record<ExecutionStatus, { 
  label: string; 
  className: string; 
  icon: React.ComponentType<{ className?: string }>;
}> = {
  not_run: {
    label: 'Not Run',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Play,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: Loader2,
  },
  passed: {
    label: 'Passed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    icon: AlertTriangle,
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: ChevronRight,
  },
};

export function ExecutionModal({ scopeId, runId: initialRunId, onClose }: ExecutionModalProps) {
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRunId || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [actualResult, setActualResult] = useState('');

  const { data: run, isLoading: runLoading } = useTestRun(activeRunId);
  const createRun = useCreateRun();
  const updateStep = useUpdateStepResult();
  const completeRun = useCompleteRun();

  // Create a run if we don't have one
  useEffect(() => {
    if (!initialRunId && !activeRunId && !createRun.isPending) {
      createRun.mutate(scopeId, {
        onSuccess: (newRun) => {
          setActiveRunId(newRun.id);
        },
      });
    }
  }, [scopeId, initialRunId, activeRunId, createRun]);

  const steps = run?.step_results || [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  // Find first unexecuted step when run loads
  useEffect(() => {
    if (steps.length > 0) {
      const firstUnexecuted = steps.findIndex(
        (s) => s.status === 'not_run' || s.status === 'in_progress'
      );
      if (firstUnexecuted >= 0) {
        setCurrentStepIndex(firstUnexecuted);
      }
    }
  }, [steps]);

  // Reset actual result when step changes
  useEffect(() => {
    setActualResult(currentStep?.actual_result || '');
  }, [currentStep?.id]);

  const handleStepResult = async (status: ExecutionStatus) => {
    if (!activeRunId || !currentStep) return;

    await updateStep.mutateAsync({
      runId: activeRunId,
      stepId: currentStep.step_id,
      data: {
        status,
        actual_result: actualResult || undefined,
      },
    });

    // Move to next step if not last
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setActualResult('');
    } else {
      // Complete the run
      await completeRun.mutateAsync({ runId: activeRunId });
      onClose();
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const isLoading = runLoading || createRun.isPending;
  const isUpdating = updateStep.isPending || completeRun.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Test Execution</span>
            {run && (
              <Badge variant="outline">
                Run #{run.run_number}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !currentStep ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No steps to execute
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Step Status Pills */}
            <div className="flex gap-1 flex-wrap px-1">
              {steps.map((step, index) => {
                const config = STATUS_CONFIG[step.status as ExecutionStatus] || STATUS_CONFIG.not_run;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(index)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                      config.className,
                      index === currentStepIndex && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <Separator />

            {/* Current Step Details */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Action
                  </h4>
                  <p className="text-foreground bg-muted p-3 rounded-lg">
                    {currentStep.step?.action || 'No action defined'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Expected Result
                  </h4>
                  <p className="text-foreground bg-muted p-3 rounded-lg">
                    {currentStep.step?.expected_result || 'No expected result defined'}
                  </p>
                </div>

                {currentStep.step?.test_data && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Test Data
                    </h4>
                    <p className="text-foreground bg-muted p-3 rounded-lg font-mono text-sm">
                      {currentStep.step.test_data}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Actual Result (optional)
                  </h4>
                  <Textarea
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    placeholder="Enter the actual result or observations..."
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousStep}
                  disabled={currentStepIndex === 0 || isUpdating}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextStep}
                  disabled={currentStepIndex >= totalSteps - 1 || isUpdating}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => handleStepResult('blocked')}
                  disabled={isUpdating}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Blocked
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleStepResult('failed')}
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Fail
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStepResult('passed')}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Pass
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
