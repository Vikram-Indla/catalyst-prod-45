import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EffortTracker } from '../execution/EffortTracker';
import { EvidenceUploader } from '../execution/EvidenceUploader';
import { StepsTable } from '../execution/StepsTable';
import { executeTestCase, ExecutionStepResult, calculateOverallStatus } from '@/services/executionService';
import { Play } from 'lucide-react';

interface QuickExecuteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: any; // execution with test case details
  onExecuteComplete?: () => void;
}

export function QuickExecuteModal({
  open,
  onOpenChange,
  execution,
  onExecuteComplete,
}: QuickExecuteModalProps) {
  const [steps, setSteps] = useState<ExecutionStepResult[]>([]);
  const [overrideStatus, setOverrideStatus] = useState(false);
  const [manualStatus, setManualStatus] = useState<string>('not_executed');
  const [effort, setEffort] = useState(0);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (execution?.test_cases?.test_steps) {
      const initialSteps: ExecutionStepResult[] = execution.test_cases.test_steps.map((step: any, index: number) => ({
        execution_id: execution.id,
        step_order: index + 1,
        step_description: step.description || step.action || '',
        expected_result: step.expected_result,
        status: 'not_executed',
        actual_result: null,
        comments: null,
      }));
      setSteps(initialSteps);
    }
  }, [execution]);

  const overallStatus = overrideStatus ? manualStatus : calculateOverallStatus(steps);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await executeTestCase({
        execution_id: execution.id,
        steps,
        overall_status: overallStatus as any,
        override_status: overrideStatus,
        manual_status: overrideStatus ? manualStatus : undefined,
        effort_actual: effort,
        comments,
        assigned_to: execution.assigned_to,
      });

      if (onExecuteComplete) {
        onExecuteComplete();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Execute error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'blocked': return 'text-orange-600';
      case 'skipped': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Execute Test Case: {execution?.test_cases?.key}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Case info */}
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">Case:</span>
              <span>{execution?.test_cases?.key}</span>
              <span>|</span>
              <span>Cycle:</span>
              <span>{execution?.test_cycles?.name}</span>
              <span>|</span>
              <span>Priority:</span>
              <span className="capitalize">{execution?.test_cases?.priority}</span>
            </div>
            <div>
              <span className="font-medium">Objective:</span> {execution?.test_cases?.objective}
            </div>
          </div>

          {/* Steps table */}
          <div>
            <Label className="text-base font-medium mb-3 block">Test Steps</Label>
            <StepsTable
              steps={steps}
              onStepsChange={setSteps}
              executionId={execution?.id}
            />
          </div>

          {/* Overall status */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Overall Status</Label>
            <div className="flex items-center gap-4">
              <div className={`text-lg font-medium ${getStatusColor(overallStatus)}`}>
                {overallStatus.replace('_', ' ').toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="override"
                  checked={overrideStatus}
                  onCheckedChange={(checked) => setOverrideStatus(checked as boolean)}
                />
                <Label htmlFor="override" className="font-normal text-sm">
                  Override auto-status
                </Label>
              </div>
              {overrideStatus && (
                <Select value={manualStatus} onValueChange={setManualStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_executed">Not Executed</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Effort tracking */}
          <EffortTracker
            executionId={execution?.id || ''}
            estimatedMinutes={execution?.effort_estimated}
            onEffortChange={setEffort}
          />

          {/* Comments */}
          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              placeholder="Add any comments about the execution..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          {/* Evidence upload */}
          <div className="space-y-2">
            <Label>Evidence</Label>
            <EvidenceUploader executionId={execution?.id || ''} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Execution'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
