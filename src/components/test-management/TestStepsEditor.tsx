import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useTestSteps,
  useCreateTestStep,
  useUpdateTestStep,
  useDeleteTestStep,
  useReorderTestSteps
} from '@/hooks/useTestManagement';
import { useToast } from '@/hooks/use-toast';

interface TestStepsEditorProps {
  testCaseId: string;
}

export const TestStepsEditor: React.FC<TestStepsEditorProps> = ({ testCaseId }) => {
  const { toast } = useToast();
  const { data: steps = [] } = useTestSteps(testCaseId);
  const createMutation = useCreateTestStep();
  const updateMutation = useUpdateTestStep();
  const deleteMutation = useDeleteTestStep();
  const reorderMutation = useReorderTestSteps();

  const [newStep, setNewStep] = useState({ action: '', expected_result: '' });
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState({ action: '', expected_result: '' });

  const handleAddStep = async () => {
    if (!newStep.action.trim()) {
      toast({
        title: 'Error',
        description: 'Step action is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        test_case_id: testCaseId,
        action: newStep.action,
        expected_result: newStep.expected_result || undefined,
        step_order: steps.length + 1
      });

      setNewStep({ action: '', expected_result: '' });
      toast({
        title: 'Success',
        description: 'Step added successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add step',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStep = async (stepId: string) => {
    if (!editingStep.action.trim()) {
      toast({
        title: 'Error',
        description: 'Step action is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: stepId,
        testCaseId,
        action: editingStep.action,
        expected_result: editingStep.expected_result || undefined
      });

      setEditingStepId(null);
      toast({
        title: 'Success',
        description: 'Step updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      await deleteMutation.mutateAsync({ id: stepId, testCaseId });
      toast({
        title: 'Success',
        description: 'Step deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete step',
        variant: 'destructive'
      });
    }
  };

  const startEditing = (step: any) => {
    setEditingStepId(step.id);
    setEditingStep({
      action: step.action,
      expected_result: step.expected_result || ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Test Steps</h3>
        <span className="text-sm text-muted-foreground">{steps.length} steps</span>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-muted/50 rounded-lg border border-border p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 mt-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <span className="text-sm font-semibold text-foreground min-w-[24px]">
                  {index + 1}.
                </span>
              </div>

              {editingStepId === step.id ? (
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`action-${step.id}`}>Action *</Label>
                    <Textarea
                      id={`action-${step.id}`}
                      value={editingStep.action}
                      onChange={(e) =>
                        setEditingStep({ ...editingStep, action: e.target.value })
                      }
                      placeholder="What action to perform?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`expected-${step.id}`}>Expected Result</Label>
                    <Textarea
                      id={`expected-${step.id}`}
                      value={editingStep.expected_result}
                      onChange={(e) =>
                        setEditingStep({ ...editingStep, expected_result: e.target.value })
                      }
                      placeholder="What should happen?"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStep(step.id)}
                      className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingStepId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Action:</p>
                    <p className="text-sm text-muted-foreground">{step.action}</p>
                  </div>

                  {step.expected_result && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Expected:</p>
                      <p className="text-sm text-muted-foreground">{step.expected_result}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(step)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteStep(step.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 rounded-lg border border-dashed border-border p-4 space-y-3">
        <Label>Add New Step</Label>

        <div className="space-y-2">
          <Textarea
            value={newStep.action}
            onChange={(e) => setNewStep({ ...newStep, action: e.target.value })}
            placeholder="What action to perform? *"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Textarea
            value={newStep.expected_result}
            onChange={(e) => setNewStep({ ...newStep, expected_result: e.target.value })}
            placeholder="What should happen? (optional)"
            rows={2}
          />
        </div>

        <Button
          onClick={handleAddStep}
          disabled={createMutation.isPending}
          variant="outline"
          size="sm"
          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>
    </div>
  );
};
