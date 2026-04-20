/**
 * ExecuteTestCaseDialog — Run a test case step-by-step and record results
 * God-tier Test Execution experience
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileText,
  Camera,
  Paperclip,
  Save,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge, PriorityBadge, TypeBadge } from './badges';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TestStep {
  id: string;
  step: number;
  action: string;
  expectedResult: string;
  testData?: string;
}

import type { TestCaseType } from '@/types/test-cases';

interface TestCase {
  id: string;       // UUID for DB operations
  key?: string;     // Display key like "INV-0001"
  title: string;
  description?: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: TestCaseType;
  steps?: TestStep[];
  preconditions?: string;
}

type StepResult = 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';

interface StepExecution {
  stepId: string;
  result: StepResult;
  actualResult?: string;
  notes?: string;
  attachments?: string[];
  executedAt?: string;
}

interface ExecuteTestCaseDialogProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (execution: {
    testCaseId: string;
    overallResult: StepResult;
    stepResults: StepExecution[];
    duration: number;
    notes?: string;
  }) => void;
}

const defaultSteps: TestStep[] = [
  { id: '1', step: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed with username and password fields' },
  { id: '2', step: 2, action: 'Enter valid username', expectedResult: 'Username is accepted in the field' },
  { id: '3', step: 3, action: 'Enter valid password', expectedResult: 'Password is masked and accepted' },
  { id: '4', step: 4, action: 'Click Sign In button', expectedResult: 'User is redirected to dashboard' },
];

export function ExecuteTestCaseDialog({
  testCase,
  open,
  onOpenChange,
  onComplete,
}: ExecuteTestCaseDialogProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepExecutions, setStepExecutions] = useState<Map<string, StepExecution>>(new Map());
  const [executionNotes, setExecutionNotes] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  if (!testCase) return null;

  const steps = testCase.steps?.length ? testCase.steps : defaultSteps;
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const completedSteps = stepExecutions.size;
  const progress = (completedSteps / totalSteps) * 100;

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(Date.now());
    setStepExecutions(new Map());
    setCurrentStepIndex(0);
    toast.info('Test execution started');
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info('Test execution paused');
  };

  const handleResume = () => {
    setIsRunning(true);
    toast.info('Test execution resumed');
  };

  const handleStepResult = (result: StepResult) => {
    const execution: StepExecution = {
      stepId: currentStep.id,
      result,
      executedAt: new Date().toISOString(),
    };

    const newExecutions = new Map(stepExecutions);
    newExecutions.set(currentStep.id, execution);
    setStepExecutions(newExecutions);

    // Auto-advance to next step if not the last one
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleUpdateStepNotes = (stepId: string, notes: string) => {
    const existing = stepExecutions.get(stepId);
    if (existing) {
      const updated = { ...existing, notes };
      const newExecutions = new Map(stepExecutions);
      newExecutions.set(stepId, updated);
      setStepExecutions(newExecutions);
    }
  };

  const handleComplete = () => {
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    // Determine overall result
    const results = Array.from(stepExecutions.values()).map(e => e.result);
    let overallResult: StepResult = 'passed';
    
    if (results.includes('failed')) {
      overallResult = 'failed';
    } else if (results.includes('blocked')) {
      overallResult = 'blocked';
    } else if (results.some(r => r === 'not_run' || r === 'skipped') && results.length < totalSteps) {
      overallResult = 'blocked';
    }

    onComplete?.({
      testCaseId: testCase.id,
      overallResult,
      stepResults: Array.from(stepExecutions.values()),
      duration,
      notes: executionNotes,
    });

    toast.success(`Test execution completed: ${overallResult.toUpperCase()}`);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setStepExecutions(new Map());
    setExecutionNotes('');
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const getStepStatus = (stepId: string): StepResult => {
    return stepExecutions.get(stepId)?.result ?? 'not_run';
  };

  const getStatusIcon = (status: StepResult) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'blocked':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-muted-foreground" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <Play className="w-5 h-5 text-primary" />
                Execute Test Case
              </DialogTitle>
              <DialogDescription className="mt-1">
                {testCase.id} — {testCase.title}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={testCase.status} size="sm" />
              <PriorityBadge priority={testCase.priority} size="sm" />
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatTime(elapsedTime)}
                </span>
                <span className="font-medium">
                  {completedSteps}/{totalSteps} completed
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Steps Sidebar */}
          <div className="w-64 border-r bg-muted/20 flex flex-col">
            <div className="p-3 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Test Steps
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {steps.map((step, index) => {
                  const status = getStepStatus(step.id);
                  const isActive = index === currentStepIndex;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStepIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                        isActive 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted/50",
                      )}
                    >
                      {getStatusIcon(status)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary"
                        )}>
                          Step {step.step}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {step.action.substring(0, 25)}...
                        </p>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Step Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Step Header */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                      {currentStep.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Step {currentStep.step}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getStepStatus(currentStep.id) === 'not_run' ? 'Not executed yet' : `Status: ${getStepStatus(currentStep.id)}`}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Action
                    </h4>
                    <p className="text-base">{currentStep.action}</p>
                  </div>

                  {/* Expected Result */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Expected Result
                    </h4>
                    <p className="text-base">{currentStep.expectedResult}</p>
                  </div>

                  {/* Test Data */}
                  {currentStep.testData && (
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Test Data
                      </h4>
                      <pre className="text-sm font-mono whitespace-pre-wrap">{currentStep.testData}</pre>
                    </div>
                  )}

                  {/* Notes for this step */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Actual Result / Notes
                    </h4>
                    <Textarea
                      placeholder="Enter actual result or notes for this step..."
                      value={stepExecutions.get(currentStep.id)?.notes || ''}
                      onChange={(e) => handleUpdateStepNotes(currentStep.id, e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Attachments */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-1.5" />
                      Screenshot
                    </Button>
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-1.5" />
                      Attach File
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </ScrollArea>

            {/* Result Buttons */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStepIndex(Math.min(totalSteps - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex === totalSteps - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => handleStepResult('skipped')}
                  >
                    <SkipForward className="w-4 h-4 mr-1.5" />
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => handleStepResult('blocked')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    Blocked
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleStepResult('failed')}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStepResult('passed')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Pass
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reset
              </Button>
              {!isRunning ? (
                <Button variant="outline" onClick={startTime ? handleResume : handleStart}>
                  <Play className="w-4 h-4 mr-1.5" />
                  {startTime ? 'Resume' : 'Start'}
                </Button>
              ) : (
                <Button variant="outline" onClick={handlePause}>
                  <Pause className="w-4 h-4 mr-1.5" />
                  Pause
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={completedSteps < totalSteps}
              >
                <Save className="w-4 h-4 mr-1.5" />
                Complete Execution
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
