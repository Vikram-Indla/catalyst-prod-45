import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useTestSteps,
  useTestCycles,
  useCreateTestExecution,
  useRecordTestExecutionSteps
} from '@/hooks/useTestManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EvidenceUploader } from './EvidenceUploader';
import { EvidenceGallery } from './EvidenceGallery';
import type { TestCase } from '@/types/test-management';

interface TestExecutionModalProps {
  testCase: TestCase;
  isOpen: boolean;
  onClose: () => void;
}

type StepStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';

export const TestExecutionModal: React.FC<TestExecutionModalProps> = ({
  testCase,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const { data: steps = [] } = useTestSteps(testCase.id);
  const { data: cycles = [] } = useTestCycles();
  const createExecutionMutation = useCreateTestExecution();
  const recordStepsMutation = useRecordTestExecutionSteps();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<Record<string, {
    status: StepStatus;
    actual_result: string;
  }>>({});

  const currentStep = steps[currentStepIndex];
  const currentResult = stepResults[currentStep?.id] || {
    status: 'not_run',
    actual_result: ''
  };

  const handleStatusChange = (status: StepStatus) => {
    if (!currentStep) return;

    setStepResults({
      ...stepResults,
      [currentStep.id]: {
        ...currentResult,
        status
      }
    });
  };

  const handleActualResultChange = (value: string) => {
    if (!currentStep) return;

    setStepResults({
      ...stepResults,
      [currentStep.id]: {
        ...currentResult,
        actual_result: value
      }
    });
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const calculateOverallStatus = (): StepStatus => {
    const statuses = Object.values(stepResults).map(r => r.status);
    if (statuses.some(s => s === 'failed')) return 'failed';
    if (statuses.some(s => s === 'blocked')) return 'blocked';
    if (statuses.every(s => s === 'passed')) return 'passed';
    if (statuses.some(s => s === 'skipped')) return 'skipped';
    return 'not_run';
  };

  const handleSaveExecution = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive'
        });
        return;
      }

      // Create execution record
      const execution = await createExecutionMutation.mutateAsync({
        test_case_id: testCase.id,
        test_cycle_id: undefined, // Can be selected from dropdown if cycles exist
        executed_by: user.id,
        execution_date: new Date().toISOString(),
        status: calculateOverallStatus(),
        actual_result: Object.values(stepResults)
          .map(r => r.actual_result)
          .filter(Boolean)
          .join('\n'),
        execution_time_seconds: 0
      });

      // Create execution step records
      const executionSteps = steps
        .filter(step => stepResults[step.id])
        .map(step => {
          const result = stepResults[step.id];
          return {
            test_execution_id: execution.id,
            test_step_id: step.id,
            status: result.status === 'not_run' ? 'skipped' : result.status,
            actual_result: result.actual_result || undefined
          };
        });

      if (executionSteps.length > 0) {
        await recordStepsMutation.mutateAsync({
          executionId: execution.id,
          steps: executionSteps
        });
      }

      toast({
        title: 'Success',
        description: 'Test execution recorded successfully'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save execution',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'passed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'blocked': return 'bg-orange-500 text-white';
      case 'skipped': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  if (steps.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Test</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              This test case has no steps to execute.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-brand-dark text-white p-6 -m-6 mb-0">
          <DialogTitle>Execute: {testCase.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
            <Badge className={getStatusColor(calculateOverallStatus())}>
              Overall: {calculateOverallStatus().replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {currentStep && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <p className="text-sm font-medium mt-1">{currentStep.action}</p>
                </div>

                {currentStep.expected_result && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Expected Result</Label>
                    <p className="text-sm mt-1">{currentStep.expected_result}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-result">Actual Result</Label>
                <Textarea
                  id="actual-result"
                  value={currentResult.actual_result}
                  onChange={(e) => handleActualResultChange(e.target.value)}
                  placeholder="What actually happened?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={currentResult.status === 'passed' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('passed')}
                    className={currentResult.status === 'passed' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    Pass
                  </Button>
                  <Button
                    variant={currentResult.status === 'failed' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('failed')}
                    className={currentResult.status === 'failed' ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    Fail
                  </Button>
                  <Button
                    variant={currentResult.status === 'blocked' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('blocked')}
                    className={currentResult.status === 'blocked' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    Blocked
                  </Button>
                  <Button
                    variant={currentResult.status === 'skipped' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('skipped')}
                    className={currentResult.status === 'skipped' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                  >
                    Skip
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Label>Evidence Attached</Label>
                <EvidenceGallery stepId={currentStep.id} />
                <EvidenceUploader stepId={currentStep.id} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`w-2 h-2 rounded-full ${
                        stepResults[step.id]?.status === 'passed'
                          ? 'bg-green-500'
                          : stepResults[step.id]?.status === 'failed'
                          ? 'bg-red-500'
                          : stepResults[step.id]?.status === 'blocked'
                          ? 'bg-orange-500'
                          : stepResults[step.id]?.status === 'skipped'
                          ? 'bg-gray-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentStepIndex === steps.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveExecution}
            disabled={createExecutionMutation.isPending}
            className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
          >
            {createExecutionMutation.isPending ? 'Saving...' : 'Save Execution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
