/**
 * TestExecutionPage — Core workflow page for executing test cases step-by-step
 * Route: /releases/execution/:cycleId/:testCaseId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Clock, 
  Pause, 
  Play,
  Bug,
  Keyboard
} from 'lucide-react';
import {
  ExecutionHeader,
  StepExecutionCard,
  TestCaseNavigator,
  LogDefectModal,
  ExecutionFooter,
} from '@/components/releases/test-execution';
import {
  mockExecutionTestCase,
  mockExecutionSteps,
  mockInitialStepResults,
  mockCycleTestCases,
  StepResult,
} from '@/data/testExecutionData';

export default function TestExecutionPage() {
  const { cycleId, testCaseId } = useParams();
  const navigate = useNavigate();

  const [testCase] = useState(mockExecutionTestCase);
  const [steps] = useState(mockExecutionSteps);
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>(mockInitialStepResults);
  const [cycleTestCases] = useState(mockCycleTestCases);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(263);
  const [isPaused, setIsPaused] = useState(false);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectStepId, setDefectStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatusChange = useCallback((stepId: string, status: 'passed' | 'failed' | 'skipped') => {
    setStepResults(prev => ({ ...prev, [stepId]: { ...prev[stepId], status } }));
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex < steps.length - 1) setActiveStepIndex(currentIndex + 1);
    toast.success(`Step ${currentIndex + 1} marked as ${status}`);
  }, [steps]);

  const handleActualResultChange = (stepId: string, value: string) => {
    setStepResults(prev => ({ ...prev, [stepId]: { ...prev[stepId], actualResult: value } }));
  };

  const handleCommentChange = (stepId: string, value: string) => {
    setStepResults(prev => ({ ...prev, [stepId]: { ...prev[stepId], comment: value } }));
  };

  const handleLogDefect = (stepId: string) => { setDefectStepId(stepId); setIsDefectModalOpen(true); };
  const handleSaveProgress = () => toast.success('Progress saved');
  const handleCancelExecution = () => { toast.info('Execution cancelled'); navigate(`/releases/test-cycles`); };

  const handleCompleteExecution = () => {
    if (!steps.every(s => stepResults[s.id]?.status)) { toast.error('Please complete all steps before finishing'); return; }
    const passedCount = Object.values(stepResults).filter(r => r.status === 'passed').length;
    toast.success(`Execution completed: ${passedCount === steps.length ? 'PASSED' : 'FAILED'}`);
    navigate(`/releases/test-cycles`);
  };

  const navigateToTestCase = (tcId: string) => { handleSaveProgress(); navigate(`/releases/execution/${cycleId}/${tcId}`); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const currentStepId = steps[activeStepIndex]?.id;
      switch (e.key.toLowerCase()) {
        case 'p': handleStatusChange(currentStepId, 'passed'); break;
        case 'f': handleStatusChange(currentStepId, 'failed'); break;
        case 's': handleStatusChange(currentStepId, 'skipped'); break;
        case 'arrowdown': case 'j': e.preventDefault(); setActiveStepIndex(i => Math.min(i + 1, steps.length - 1)); break;
        case 'arrowup': case 'k': e.preventDefault(); setActiveStepIndex(i => Math.max(i - 1, 0)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStepIndex, steps, handleStatusChange]);

  const completedSteps = Object.values(stepResults).filter(r => r.status).length;
  const passedSteps = Object.values(stepResults).filter(r => r.status === 'passed').length;
  const failedSteps = Object.values(stepResults).filter(r => r.status === 'failed').length;
  const allStepsComplete = completedSteps === steps.length;
  const defectStepIndex = defectStepId ? steps.findIndex(s => s.id === defectStepId) : -1;
  const defectActualResult = defectStepId ? stepResults[defectStepId]?.actualResult : '';

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex-1 p-6 pb-24 overflow-auto bg-muted/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">RELEASES</span>
              <span>/</span>
              <span>Test Execution</span>
            </div>
            <Link to="/releases/test-cycles" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to Cycle {cycleId || 'CY-26.01.01-02'}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-lg font-semibold">{formatTime(elapsedTime)}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <><Play className="w-4 h-4 mr-2" />Resume</> : <><Pause className="w-4 h-4 mr-2" />Pause</>}
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDefectStepId(steps[activeStepIndex]?.id || null); setIsDefectModalOpen(true); }}>
              <Bug className="w-4 h-4 mr-2" />Log Defect
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg w-fit">
          <Keyboard className="w-4 h-4" />
          <span>Keyboard:</span>
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">P</kbd> Pass</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">F</kbd> Fail</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">S</kbd> Skip</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↑↓</kbd> Navigate</span>
        </div>

        <ExecutionHeader testCase={testCase} completedSteps={completedSteps} totalSteps={steps.length} passedSteps={passedSteps} failedSteps={failedSteps} />

        <div className="flex gap-6 mt-6">
          <div className="flex-1 space-y-4">
            {steps.map((step, index) => (
              <StepExecutionCard key={step.id} step={step} index={index} result={stepResults[step.id]} isActive={activeStepIndex === index} onStatusChange={handleStatusChange} onActualResultChange={handleActualResultChange} onCommentChange={handleCommentChange} onActivate={() => setActiveStepIndex(index)} onLogDefect={handleLogDefect} />
            ))}
          </div>
          <div className="w-[280px] flex-shrink-0">
            <TestCaseNavigator cycleId={cycleId || 'CY-26.01.01-02'} cycleName={testCase.cycleName} testCases={cycleTestCases} currentTestCaseId={testCaseId || 'TC-001'} onNavigate={navigateToTestCase} />
          </div>
        </div>
      </div>

      <ExecutionFooter completedSteps={completedSteps} totalSteps={steps.length} allStepsComplete={allStepsComplete} onCancel={handleCancelExecution} onSaveProgress={handleSaveProgress} onCompleteExecution={handleCompleteExecution} />
      <LogDefectModal isOpen={isDefectModalOpen} onClose={() => setIsDefectModalOpen(false)} testCaseId={testCaseId || 'TC-001'} stepNumber={defectStepIndex + 1} actualResult={defectActualResult} />
    </motion.div>
  );
}
