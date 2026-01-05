/**
 * Execution Runner Page - Full-page test execution interface
 * Route: /tests/execution/:cycleId/:scopeId?
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTestCycle } from '../../../hooks/useCycles';
import { useTestRun, useCreateRun, useUpdateStepResult, useCompleteRun, useBulkUpdateSteps } from '../../../hooks/useExecution';
import { useExecutionTimer } from '../hooks/useExecutionTimer';
import { useExecutionKeyboard } from '../hooks/useExecutionKeyboard';
import { ExecutionHeader } from './ExecutionHeader';
import { TestCasePanel } from './TestCasePanel';
import { ExecutionContextPanel } from './ExecutionContextPanel';
import { ExecutionFooter } from './ExecutionFooter';
import { QuickDefectDialog } from '../QuickDefectDialog';
import type { ExecutionStatus, CycleScope } from '../../../api/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ExecutionRunnerPage() {
  const { cycleId, scopeId: urlScopeId } = useParams<{ cycleId: string; scopeId?: string }>();
  const navigate = useNavigate();

  // Data fetching
  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId || '');
  const scope = cycle?.scope || [];

  // State
  const [currentScopeId, setCurrentScopeId] = useState<string | null>(urlScopeId || null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'queue' | 'defects' | 'activity'>('summary');
  const [preconditionsVerified, setPreconditionsVerified] = useState(false);

  // Mutations
  const createRun = useCreateRun();
  const updateStep = useUpdateStepResult();
  const completeRun = useCompleteRun();
  const bulkUpdate = useBulkUpdateSteps();

  // Current scope and position
  const currentScope = scope?.find(s => s.id === currentScopeId);
  const currentIndex = scope?.findIndex(s => s.id === currentScopeId) ?? 0;
  const totalCases = scope?.length ?? 0;

  // Get or create run for current scope
  const { data: run, isLoading: runLoading } = useTestRun(activeRunId);

  // Timer
  const timer = useExecutionTimer(activeRunId, isComplete);

  // Steps data
  const steps = run?.step_results || [];
  const currentStep = steps[currentStepIndex];

  // Initialize first scope if not specified
  useEffect(() => {
    if (!currentScopeId && scope && scope.length > 0) {
      const firstUnfinished = scope.find(s => 
        s.current_status === 'not_run' || s.current_status === 'in_progress'
      ) || scope[0];
      setCurrentScopeId(firstUnfinished.id);
    }
  }, [scope, currentScopeId]);

  // Create/resume run when scope changes
  useEffect(() => {
    if (!currentScopeId || createRun.isPending) return;

    const currentScopeData = scope?.find(s => s.id === currentScopeId);
    if (currentScopeData?.latest_run_id) {
      setActiveRunId(currentScopeData.latest_run_id);
    } else {
      // Create new run
      createRun.mutate(currentScopeId, {
        onSuccess: (newRun) => {
          setActiveRunId(newRun.id);
          setIsComplete(false);
          setPreconditionsVerified(false);
        },
      });
    }
  }, [currentScopeId, scope]);

  // Find first unexecuted step when run loads
  useEffect(() => {
    if (steps.length > 0) {
      const firstUnexecuted = steps.findIndex(
        s => s.status === 'not_run' || s.status === 'in_progress'
      );
      if (firstUnexecuted >= 0) {
        setCurrentStepIndex(firstUnexecuted);
      }
    }
  }, [run?.id]);

  // Navigation handlers
  const goToPreviousCase = useCallback(() => {
    if (currentIndex > 0 && scope) {
      const prevScope = scope[currentIndex - 1];
      setCurrentScopeId(prevScope.id);
      setActiveRunId(null);
      setCurrentStepIndex(0);
    }
  }, [currentIndex, scope]);

  const goToNextCase = useCallback(() => {
    if (scope && currentIndex < scope.length - 1) {
      const nextScope = scope[currentIndex + 1];
      setCurrentScopeId(nextScope.id);
      setActiveRunId(null);
      setCurrentStepIndex(0);
    }
  }, [currentIndex, scope]);

  // Step status handler
  const handleStepStatus = useCallback(async (status: ExecutionStatus) => {
    if (!activeRunId || !currentStep) return;

    timer.recordActivity();

    await updateStep.mutateAsync({
      runId: activeRunId,
      stepId: currentStep.step_id,
      data: { status },
    });

    // Move to next step if not last
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Check if all steps are complete
      const allComplete = steps.every((s, i) => 
        i === currentStepIndex ? true : ['passed', 'failed', 'blocked', 'skipped'].includes(s.status)
      );
      if (allComplete) {
        setIsComplete(true);
        await completeRun.mutateAsync({ runId: activeRunId });
        toast.success('Test case completed!');
        // Auto-advance to next case if available
        if (currentIndex < totalCases - 1) {
          goToNextCase();
        }
      }
    }
  }, [activeRunId, currentStep, currentStepIndex, steps, timer, updateStep, completeRun, goToNextCase, currentIndex, totalCases]);

  // Step navigation
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  // Complete run handler
  const handleCompleteRun = useCallback(async () => {
    if (!activeRunId) return;
    
    await completeRun.mutateAsync({ runId: activeRunId });
    setIsComplete(true);
    toast.success('Test run completed!');
    
    // Go to next case if available
    if (currentIndex < totalCases - 1) {
      goToNextCase();
    }
  }, [activeRunId, completeRun, currentIndex, totalCases, goToNextCase]);

  // Handle selecting case from queue
  const handleSelectCase = useCallback((scopeItem: CycleScope) => {
    setCurrentScopeId(scopeItem.id);
    setActiveRunId(null);
    setCurrentStepIndex(0);
  }, []);

  // Back to cycle
  const handleBack = useCallback(() => {
    navigate(`/tests/cycles/${cycleId}`);
  }, [navigate, cycleId]);

  // Keyboard shortcuts
  useExecutionKeyboard({
    isOpen: true,
    isUpdating: updateStep.isPending || completeRun.isPending || bulkUpdate.isPending,
    onSetStatus: handleStepStatus,
    onOpenDefect: () => setDefectDialogOpen(true),
    onToggleTimer: timer.toggleTimer,
    onNext: () => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        goToNextCase();
      }
    },
    onPrevious: () => {
      if (currentStepIndex > 0) {
        setCurrentStepIndex(currentStepIndex - 1);
      } else {
        goToPreviousCase();
      }
    },
  });

  const isLoading = cycleLoading || runLoading || createRun.isPending;
  const isUpdating = updateStep.isPending || completeRun.isPending || bulkUpdate.isPending;

  if (isLoading && !run) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading execution...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
      {/* Header Command Bar */}
      <ExecutionHeader
        cycle={cycle}
        currentIndex={currentIndex}
        totalCases={totalCases}
        timer={timer}
        run={run}
        onBack={handleBack}
        onPreviousCase={goToPreviousCase}
        onNextCase={goToNextCase}
        onCompleteRun={handleCompleteRun}
        isUpdating={isUpdating}
      />

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
        {/* Execution Panel - Left 65% */}
        <TestCasePanel
          testCase={currentScope?.test_case}
          run={run}
          steps={steps}
          currentStepIndex={currentStepIndex}
          preconditionsVerified={preconditionsVerified}
          onVerifyPreconditions={() => setPreconditionsVerified(true)}
          onStepStatus={handleStepStatus}
          onStepSelect={goToStep}
          onLogDefect={() => setDefectDialogOpen(true)}
          isUpdating={isUpdating}
        />

        {/* Context Panel - Right 35% */}
        <ExecutionContextPanel
          run={run}
          scope={scope || []}
          currentScopeId={currentScopeId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectCase={handleSelectCase}
          onLogDefect={() => setDefectDialogOpen(true)}
        />
      </main>

      {/* Footer with shortcuts and stats */}
      <ExecutionFooter run={run} steps={steps} />

      {/* Quick Defect Dialog */}
      <QuickDefectDialog
        open={defectDialogOpen}
        onOpenChange={setDefectDialogOpen}
        stepAction={currentStep?.step?.action}
        expectedResult={currentStep?.step?.expected_result}
        actualResult=""
        onSubmit={async (data) => {
          console.log('Defect data:', data);
          toast.success('Defect logged successfully');
        }}
      />
    </div>
  );
}
