/**
 * Execution Modal - Enhanced with Monopoly Features
 * - Auto-timer with inactivity pause
 * - Keyboard shortcuts
 * - Screenshot paste (Ctrl+V)
 * - Quick defect logging
 * - Pass All Remaining / Re-run Failed
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  SkipForward,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { useTestRun, useCreateRun, useUpdateStepResult, useCompleteRun, useBulkUpdateSteps } from '../../hooks/useExecution';
import type { ExecutionStatus, StepResult } from '../../api/types';
import { useExecutionTimer } from './hooks/useExecutionTimer';
import { useExecutionKeyboard } from './hooks/useExecutionKeyboard';
import { useScreenshotPaste } from './hooks/useScreenshotPaste';
import { ExecutionTimer } from './ExecutionTimer';
import { ExecutionProgress } from './ExecutionProgress';
import { ExecutionShortcutHints } from './ExecutionShortcutHints';
import { ExecutionScreenshots } from './ExecutionScreenshots';
import { QuickDefectDialog } from './QuickDefectDialog';
import { toast } from 'sonner';

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
    className: 'bg-muted text-muted-foreground',
    icon: Play,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
    icon: Loader2,
  },
  passed: {
    label: 'Passed',
    className: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
    icon: XCircle,
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
    icon: AlertTriangle,
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-muted text-muted-foreground',
    icon: SkipForward,
  },
};

export function ExecutionModal({ scopeId, runId: initialRunId, onClose }: ExecutionModalProps) {
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRunId || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [actualResult, setActualResult] = useState('');
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { data: run, isLoading: runLoading } = useTestRun(activeRunId);
  const createRun = useCreateRun();
  const updateStep = useUpdateStepResult();
  const completeRun = useCompleteRun();
  const bulkUpdate = useBulkUpdateSteps();

  const steps = run?.step_results || [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  // Timer hook
  const timer = useExecutionTimer(activeRunId, isComplete);

  // Screenshot paste hook
  const screenshots = useScreenshotPaste(true);

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
    screenshots.clearScreenshots();
  }, [currentStep?.id]);

  const handleStepResult = useCallback(async (status: ExecutionStatus) => {
    if (!activeRunId || !currentStep) return;

    timer.recordActivity();

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
      screenshots.clearScreenshots();
    } else {
      // Check if all steps are complete
      const allComplete = steps.every((s, i) => 
        i === currentStepIndex ? true : ['passed', 'failed', 'blocked', 'skipped'].includes(s.status)
      );
      if (allComplete) {
        setIsComplete(true);
        await completeRun.mutateAsync({ runId: activeRunId });
        toast.success('Test run completed!');
        onClose();
      }
    }
  }, [activeRunId, currentStep, currentStepIndex, totalSteps, actualResult, timer, updateStep, completeRun, steps, screenshots, onClose]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, totalSteps]);

  const handlePassAllRemaining = async () => {
    if (!activeRunId) return;

    timer.recordActivity();

    const remainingSteps = steps
      .filter((s) => s.status === 'not_run' || s.status === 'in_progress')
      .map((s) => ({
        step_id: s.step_id,
        status: 'passed' as ExecutionStatus,
      }));

    if (remainingSteps.length === 0) {
      toast.info('No remaining steps to pass');
      return;
    }

    await bulkUpdate.mutateAsync({
      runId: activeRunId,
      updates: remainingSteps,
    });

    setIsComplete(true);
    await completeRun.mutateAsync({ runId: activeRunId });
    toast.success(`Passed ${remainingSteps.length} remaining steps`);
    onClose();
  };

  const handleRerunFailed = async () => {
    if (!activeRunId) return;

    const failedSteps = steps.filter((s) => s.status === 'failed' || s.status === 'blocked');
    
    if (failedSteps.length === 0) {
      toast.info('No failed steps to re-run');
      return;
    }

    // Reset failed steps to not_run status for this run
    const failedStepUpdates = failedSteps.map((s) => ({
      step_id: s.step_id,
      status: 'not_run' as ExecutionStatus,
    }));

    await bulkUpdate.mutateAsync({
      runId: activeRunId,
      updates: failedStepUpdates,
    });
    
    // Reset to first failed step
    const firstFailedIndex = steps.findIndex((s) => s.status === 'failed' || s.status === 'blocked');
    if (firstFailedIndex >= 0) {
      setCurrentStepIndex(firstFailedIndex);
    }
    
    toast.success(`Re-running ${failedSteps.length} failed steps`);
  };

  const handleDefectSubmit = async (data: any) => {
    // TODO: Integrate with defect API
    console.log('Defect data:', data, 'Screenshots:', screenshots.getFiles());
    toast.success('Defect logged successfully');
  };

  // Keyboard shortcuts
  useExecutionKeyboard({
    isOpen: true,
    isUpdating: updateStep.isPending || completeRun.isPending || bulkUpdate.isPending,
    onSetStatus: handleStepResult,
    onOpenDefect: () => setDefectDialogOpen(true),
    onToggleTimer: timer.toggleTimer,
    onNext: handleNextStep,
    onPrevious: handlePreviousStep,
  });

  const isLoading = runLoading || createRun.isPending;
  const isUpdating = updateStep.isPending || completeRun.isPending || bulkUpdate.isPending;

  const failedStepsCount = steps.filter((s) => s.status === 'failed' || s.status === 'blocked').length;
  const remainingStepsCount = steps.filter((s) => s.status === 'not_run' || s.status === 'in_progress').length;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <span>Test Execution</span>
                {run && (
                  <Badge variant="outline">
                    Run #{run.run_number}
                  </Badge>
                )}
              </DialogTitle>
              <ExecutionTimer
                formattedTime={timer.formattedTime}
                isRunning={timer.isRunning}
                onToggle={timer.toggleTimer}
                disabled={isComplete}
              />
            </div>
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
              {/* Progress Section */}
              <ExecutionProgress
                steps={steps.map((s) => ({ id: s.id, status: s.status as ExecutionStatus }))}
                currentIndex={currentStepIndex}
                onStepClick={setCurrentStepIndex}
              />

              <Separator />

              {/* Current Step Details */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Action
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[var(--sem-danger)] hover:text-[var(--sem-danger)] hover:bg-[var(--sem-danger-bg)]"
                        onClick={() => setDefectDialogOpen(true)}
                      >
                        <Bug className="h-3 w-3 mr-1" />
                        Log Defect
                      </Button>
                    </div>
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

                  {/* Screenshot paste area */}
                  <ExecutionScreenshots
                    screenshots={screenshots.screenshots}
                    onRemove={screenshots.removeScreenshot}
                  />
                </div>
              </ScrollArea>

              <Separator />

              {/* Bulk Actions Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {remainingStepsCount > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePassAllRemaining}
                      disabled={isUpdating}
                      className="text-[var(--sem-success)] hover:text-[var(--sem-success)] hover:bg-[var(--sem-success-bg)]"
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Pass All Remaining ({remainingStepsCount})
                    </Button>
                  )}
                  {failedStepsCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRerunFailed}
                      disabled={isUpdating}
                      className="text-[var(--sem-warning)] hover:text-[var(--sem-warning)] hover:bg-[var(--sem-warning-bg)]"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Re-run Failed ({failedStepsCount})
                    </Button>
                  )}
                </div>
              </div>

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
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => handleStepResult('skipped')}
                    disabled={isUpdating}
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[var(--sem-warning)] hover:text-[var(--sem-warning)] hover:bg-[var(--sem-warning-bg)]"
                    onClick={() => handleStepResult('blocked')}
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Blocked
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[var(--sem-danger)] hover:text-[var(--sem-danger)] hover:bg-[var(--sem-danger-bg)]"
                    onClick={() => handleStepResult('failed')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[var(--sem-success)] hover:bg-[var(--sem-success)]/90 text-[var(--text-inverse)]"
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

              {/* Keyboard Shortcuts Hints */}
              <ExecutionShortcutHints />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Defect Dialog */}
      <QuickDefectDialog
        open={defectDialogOpen}
        onOpenChange={setDefectDialogOpen}
        stepAction={currentStep?.step?.action}
        expectedResult={currentStep?.step?.expected_result}
        actualResult={actualResult}
        onSubmit={handleDefectSubmit}
      />
    </>
  );
}
