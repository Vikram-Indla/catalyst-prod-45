/**
 * TestExecutionPage - Step Focus Mode for executing test cases
 * A focused, Typeform-style one-step-at-a-time experience
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useExecutionStore } from './stores/executionStore';
import { useTimer } from './hooks/useTimer';
import { useStepNavigation } from './hooks/useStepNavigation';
import { ExecutionHeader } from './components/ExecutionHeader';
import { StepView } from './components/StepView';
import { CompleteView } from './components/CompleteView';
import { ExecutionFooter } from './components/ExecutionFooter';
import { DefectPrompt } from './components/DefectPrompt';
import { NoteModal } from './components/Modals/NoteModal';
import { ExitModal } from './components/Modals/ExitModal';
import { LogDefectModal } from '@/components/releases/test-execution/LogDefectModal';
import {
  mockExecutionTestCase,
  mockExecutionSteps,
  mockCycleTestCases,
} from '@/data/testExecutionData';

export default function TestExecutionFocusPage() {
  const { cycleId, testCaseId } = useParams();
  const navigate = useNavigate();
  
  // Store
  const {
    session,
    steps,
    currentStepIndex,
    isComplete,
    showDefectPrompt,
    initSession,
    markStep,
    skipStep,
    addNote,
    addEvidence,
    removeEvidence,
    dismissDefectPrompt,
    reset,
  } = useExecutionStore();
  
  // Hooks
  const timer = useTimer();
  const navigation = useStepNavigation();
  
  // Local state for modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  
  // Initialize session
  useEffect(() => {
    const stepsDisplay = mockExecutionSteps.map((s, i) => ({
      id: s.id,
      number: i + 1,
      title: `Step ${i + 1}`,
      action: s.action,
      expected: s.expectedResult,
      status: 'pending' as const,
    }));
    
    initSession(
      mockExecutionTestCase.id,
      mockExecutionTestCase.title,
      stepsDisplay
    );
    
    return () => reset();
  }, [testCaseId, initSession, reset]);
  
  // Current step data
  const currentStep = steps[currentStepIndex];
  const currentStepResult = session?.stepResults[currentStepIndex] || null;
  
  // Stats for complete view
  const passed = steps.filter(s => s.status === 'passed').length;
  const failed = steps.filter(s => s.status === 'failed').length;
  const blocked = steps.filter(s => s.status === 'blocked').length;
  const skipped = steps.filter(s => s.status === 'skipped').length;
  const completed = passed + failed + blocked + skipped;
  
  // Find next test in queue
  const currentTestIndex = mockCycleTestCases.findIndex(tc => tc.id === testCaseId);
  const hasNextTest = currentTestIndex < mockCycleTestCases.length - 1;
  
  // Handlers
  const handleBack = useCallback(() => {
    setExitModalOpen(true);
  }, []);
  
  const handleExit = useCallback(() => {
    setExitModalOpen(true);
  }, []);
  
  const handleConfirmExit = useCallback(() => {
    toast.success('Progress saved');
    navigate('/releases/test-cycles');
  }, [navigate]);
  
  const handleLogDefect = useCallback(() => {
    dismissDefectPrompt();
    setDefectModalOpen(true);
  }, [dismissDefectPrompt]);
  
  const handleNextTest = useCallback(() => {
    if (hasNextTest) {
      const nextTest = mockCycleTestCases[currentTestIndex + 1];
      navigate(`/releases/execution/${cycleId}/${nextTest.id}`);
    }
  }, [hasNextTest, currentTestIndex, cycleId, navigate]);
  
  const handleAddNote = useCallback(() => {
    setNoteModalOpen(true);
  }, []);
  
  const handleSaveNote = useCallback((note: string) => {
    addNote(currentStepIndex, note);
    toast.success('Note saved');
  }, [addNote, currentStepIndex]);
  
  const handleAddEvidence = useCallback(() => {
    // Mock evidence for now
    const mockEvidence = {
      id: `ev-${Date.now()}`,
      type: 'screenshot' as const,
      name: `Screenshot_${new Date().toISOString().slice(0, 10)}.png`,
    };
    addEvidence(currentStepIndex, mockEvidence);
    toast.success('Evidence attached');
  }, [addEvidence, currentStepIndex]);
  
  const handleRemoveEvidence = useCallback((evidenceId: string) => {
    removeEvidence(currentStepIndex, evidenceId);
  }, [removeEvidence, currentStepIndex]);
  
  if (!session || steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return (
    <motion.div
      className="flex flex-col h-screen bg-muted/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <ExecutionHeader
        testCaseId={session.testCaseId}
        testCaseTitle={session.testCaseTitle}
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        elapsedTime={timer.formattedTime}
        isTimerRunning={timer.isRunning}
        steps={steps}
        onBack={handleBack}
        onExit={handleExit}
        onToggleTimer={timer.toggle}
        onStepClick={navigation.goToStep}
      />
      
      {/* Main Content */}
      {isComplete ? (
        <CompleteView
          testCaseId={session.testCaseId}
          testCaseTitle={session.testCaseTitle}
          passed={passed}
          failed={failed}
          blocked={blocked}
          skipped={skipped}
          onLogDefect={() => setDefectModalOpen(true)}
          onNextTest={handleNextTest}
          hasNextTest={hasNextTest}
        />
      ) : currentStep ? (
        <StepView
          step={currentStep}
          stepResult={currentStepResult}
          onPass={() => markStep('passed')}
          onFail={() => markStep('failed')}
          onBlocked={() => markStep('blocked')}
          onAddNote={handleAddNote}
          onAddEvidence={handleAddEvidence}
          onRemoveEvidence={handleRemoveEvidence}
        />
      ) : null}
      
      {/* Footer (hidden when complete) */}
      {!isComplete && (
        <ExecutionFooter
          canGoPrev={navigation.canGoPrev}
          canGoNext={navigation.canGoNext}
          onSkip={skipStep}
          onPrev={navigation.prevStep}
          onNext={navigation.nextStep}
        />
      )}
      
      {/* Defect Prompt */}
      <DefectPrompt
        visible={showDefectPrompt}
        onLogDefect={handleLogDefect}
        onDismiss={dismissDefectPrompt}
      />
      
      {/* Modals */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        stepNumber={currentStepIndex + 1}
        initialNote={currentStepResult?.note || ''}
        onSave={handleSaveNote}
      />
      
      <ExitModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onConfirm={handleConfirmExit}
        completedSteps={completed}
        totalSteps={steps.length}
      />
      
      <LogDefectModal
        isOpen={defectModalOpen}
        onClose={() => setDefectModalOpen(false)}
        testCaseId={session.testCaseId}
        stepNumber={currentStepIndex + 1}
        actualResult=""
      />
    </motion.div>
  );
}
