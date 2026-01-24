/**
 * Module 3A-2: Step Runner Container
 * Main orchestrating component for step-by-step test execution
 * Enhanced with Module 3A-3: Result Recording & Evidence
 * Phase 3: Data-Driven Test Execution support
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTestExecution } from '../../hooks/useTestExecution';
import { useStepNavigationV2 } from '../../hooks/useStepNavigationV2';
import { useStepResultMutation } from '../../hooks/useStepResultMutation';
import { useExecutionKeyboard } from '../../hooks/useExecutionKeyboard';
import { useExecutionTimer } from '../../hooks/useExecutionTimer';
import { ExecutionHeader } from './ExecutionHeader';
import { StepDisplay } from './StepDisplay';
import { StepResultButtons } from './StepResultButtons';
import { StepProgressBar } from './StepProgressBar';
import { StepNotes } from './StepNotes';
import { CompletionDialog } from './CompletionDialog';
import { ExitDialog } from './ExitDialog';
import { ResultRecorder } from '../evidence';
import { TestDataPanel } from '@/components/test-management/TestDataPanel';
import type { StepResult, ExecutionResult } from '../../types/step-execution';

interface StepRunnerProps {
  runId: string;
  testCaseId: string;
  executionId: string;
  onComplete?: () => void;
  onExit?: () => void;
}

export function StepRunner({
  runId,
  testCaseId,
  executionId,
  onComplete,
  onExit,
}: StepRunnerProps) {
  const navigate = useNavigate();
  const [showNotes, setShowNotes] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [actualResult, setActualResult] = useState('');

  // Data hooks
  const { testCase, steps, run, progress, isLoading, error } = useTestExecution(runId, testCaseId);
  const navigation = useStepNavigationV2(steps.length);
  const { recordResult, completeExecution, isRecording, isCompleting } = useStepResultMutation(runId, testCaseId);
  const timer = useExecutionTimer();

  const currentStep = steps[navigation.currentStepIndex];
  const isLastStep = navigation.isLastStep;

  // Start timer when component mounts or step changes
  useEffect(() => {
    timer.restart();
  }, [navigation.currentStepIndex]);

  // Handle result recording
  const handleRecordResult = useCallback(async (result: StepResult) => {
    if (!currentStep || isRecording) return;

    timer.stop();
    
    await recordResult.mutateAsync({
      step_id: currentStep.id,
      result,
      duration_seconds: timer.getElapsed(),
    });

    // Auto-advance to next step
    if (autoAdvance && !isLastStep) {
      navigation.nextStep();
    } else if (isLastStep && progress.completed === progress.total - 1) {
      // All steps complete, show completion dialog
      setShowCompletionDialog(true);
    }
  }, [currentStep, isRecording, timer, recordResult, autoAdvance, navigation, progress]);

  // Handle execution completion
  const handleComplete = useCallback(async (result: ExecutionResult) => {
    await completeExecution.mutateAsync({ overall_result: result });
    setShowCompletionDialog(false);
    onComplete?.();
  }, [completeExecution, onComplete]);

  // Handle exit
  const handleExit = useCallback(() => {
    setShowExitDialog(false);
    onExit?.();
    navigate(-1);
  }, [onExit, navigate]);

  // Handle save notes
  const handleSaveNotes = useCallback(async (notes: string) => {
    if (!currentStep) return;
    // Notes are saved with next result, or we could add a separate save
  }, [currentStep]);

  // Keyboard shortcuts
  useExecutionKeyboard({
    onPass: () => handleRecordResult('passed'),
    onFail: () => handleRecordResult('failed'),
    onBlock: () => handleRecordResult('blocked'),
    onSkip: () => handleRecordResult('skipped'),
    onPrev: navigation.prevStep,
    onNext: navigation.nextStep,
    onNotes: () => setShowNotes(!showNotes),
    onExit: () => setShowExitDialog(true),
    enabled: !showExitDialog && !showCompletionDialog,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Failed to load test case</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message || 'Test case not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <ExecutionHeader
        testCase={testCase}
        run={run}
        progress={progress}
        timerDisplay={timer.formattedTime}
        isTimerRunning={timer.isRunning}
        onTimerToggle={() => timer.isRunning ? timer.stop() : timer.start()}
        onExit={() => setShowExitDialog(true)}
      />

      {/* Step Progress Bar */}
      <div className="px-4 py-3 border-b border-border">
        <StepProgressBar
          steps={steps}
          currentIndex={navigation.currentStepIndex}
          onStepClick={navigation.goToStep}
        />
      </div>

      {/* Test Data Panel - Phase 3 DDT Support */}
      {run?.test_data_row_snapshot && (
        <div className="px-4 py-3 border-b border-border">
          <TestDataPanel
            rowSnapshot={run.test_data_row_snapshot as Record<string, string>}
            rowNumber={run.test_data_row_number}
            className="max-w-4xl mx-auto"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {currentStep && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Step Display */}
            <StepDisplay
              step={currentStep}
              stepNumber={navigation.currentStepIndex + 1}
              totalSteps={navigation.totalSteps}
            />

            {/* Result Recording & Evidence - Module 3A-3 */}
            <ResultRecorder
              executionId={executionId}
              stepResultId={currentStep.id}
              stepId={currentStep.id}
              expectedResult={currentStep.expected_result}
              actualResult={actualResult}
              onActualResultChange={setActualResult}
              disabled={isRecording}
            />

            {/* Notes Section */}
            <StepNotes
              stepId={currentStep.id}
              initialNotes={currentStep.notes}
              isOpen={showNotes}
              onToggle={() => setShowNotes(!showNotes)}
              onSave={handleSaveNotes}
              disabled={isRecording}
            />
          </div>
        )}
      </div>

      {/* Result Buttons - Fixed at bottom */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <StepResultButtons
            onResult={handleRecordResult}
            currentResult={currentStep?.result ?? null}
            isLoading={isRecording}
            showHints
          />

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <button
              onClick={navigation.prevStep}
              disabled={!navigation.canGoPrev}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous <span className="text-xs opacity-60">(←)</span>
            </button>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="rounded"
              />
              Auto-advance on result
            </label>

            <button
              onClick={navigation.nextStep}
              disabled={!navigation.canGoNext}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <span className="text-xs opacity-60">(→)</span> →
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExitDialog
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onExit={handleExit}
        onSaveAndExit={handleExit}
        progress={progress}
      />

      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        onComplete={handleComplete}
        progress={progress}
        isSubmitting={isCompleting}
      />
    </div>
  );
}
