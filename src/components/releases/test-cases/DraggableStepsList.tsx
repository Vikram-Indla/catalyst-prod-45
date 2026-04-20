/**
 * Draggable Steps List Component
 * Allows reordering test case steps via drag-and-drop
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lozenge } from '@/components/ads';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  testData?: string;
  notes?: string;
}

interface DraggableStepsListProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
  readOnly?: boolean;
}

interface StepItemProps {
  step: TestStep;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (step: TestStep) => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  readOnly?: boolean;
}

function StepItem({
  step,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  readOnly,
}: StepItemProps) {
  const [editedStep, setEditedStep] = useState(step);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    if (!editedStep.action.trim()) {
      toast.error('Action is required');
      return;
    }
    if (!editedStep.expectedResult.trim()) {
      toast.error('Expected result is required');
      return;
    }
    onSave(editedStep);
  };

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border-2 border-primary rounded-lg p-4 bg-primary/5"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Lozenge appearance="default">Step {index + 1}</Lozenge>
            <span className="text-xs text-muted-foreground">Editing...</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Action</label>
            <Textarea
              value={editedStep.action}
              onChange={(e) => setEditedStep({ ...editedStep, action: e.target.value })}
              placeholder="Describe the action to perform..."
              className="min-h-[60px] resize-none"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Expected Result</label>
            <Textarea
              value={editedStep.expectedResult}
              onChange={(e) => setEditedStep({ ...editedStep, expectedResult: e.target.value })}
              placeholder="Describe the expected outcome..."
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Test Data (optional)</label>
            <Input
              value={editedStep.testData || ''}
              onChange={(e) => setEditedStep({ ...editedStep, testData: e.target.value })}
              placeholder="Enter test data if needed..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Notes (optional)</label>
            <Input
              value={editedStep.notes || ''}
              onChange={(e) => setEditedStep({ ...editedStep, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" />
              Save Step
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        "group border rounded-lg transition-all hover:border-primary/50 hover:shadow-sm",
        readOnly && "cursor-default"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {!readOnly && (
          <div className="cursor-grab active:cursor-grabbing pt-1">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Lozenge appearance="default">{index + 1}</Lozenge>
            <p className="font-medium text-sm truncate">{step.action}</p>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            <span className="font-medium text-green-600 dark:text-green-400">Expected:</span>{' '}
            {step.expectedResult}
          </p>

          {(step.testData || step.notes) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              {isExpanded ? 'Hide' : 'Show'} details
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                  {step.testData && (
                    <p>
                      <span className="text-muted-foreground">Test Data:</span>{' '}
                      <code className="bg-muted px-1 rounded">{step.testData}</code>
                    </p>
                  )}
                  {step.notes && (
                    <p>
                      <span className="text-muted-foreground">Notes:</span> {step.notes}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit step</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate step</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete step</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function DraggableStepsList({ steps, onChange, readOnly }: DraggableStepsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleReorder = (newOrder: TestStep[]) => {
    const reindexed = newOrder.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    onChange(reindexed);
  };

  const handleSaveStep = useCallback((updatedStep: TestStep) => {
    const newSteps = steps.map((s) =>
      s.id === updatedStep.id ? updatedStep : s
    );
    onChange(newSteps);
    setEditingId(null);
    toast.success('Step updated');
  }, [steps, onChange]);

  const handleDeleteStep = useCallback((id: string) => {
    const newSteps = steps
      .filter((s) => s.id !== id)
      .map((step, i) => ({ ...step, stepNumber: i + 1 }));
    onChange(newSteps);
    toast.success('Step deleted');
  }, [steps, onChange]);

  const handleDuplicateStep = useCallback((step: TestStep) => {
    const index = steps.findIndex((s) => s.id === step.id);
    const newStep: TestStep = {
      ...step,
      id: `step-${Date.now()}`,
      stepNumber: index + 2,
    };
    const newSteps = [
      ...steps.slice(0, index + 1),
      newStep,
      ...steps.slice(index + 1).map((s) => ({ ...s, stepNumber: s.stepNumber + 1 })),
    ];
    onChange(newSteps);
    toast.success('Step duplicated');
  }, [steps, onChange]);

  const handleAddNewStep = useCallback(() => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      stepNumber: steps.length + 1,
      action: '',
      expectedResult: '',
    };
    onChange([...steps, newStep]);
    setEditingId(newStep.id);
    setIsAddingNew(false);
  }, [steps, onChange]);

  if (steps.length === 0 && !isAddingNew) {
    return (
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium mb-1">No test steps defined</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add steps to define the test procedure
        </p>
        {!readOnly && (
          <Button onClick={handleAddNewStep}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Step
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Test Steps</h3>
          <Lozenge appearance="default">{steps.length} steps</Lozenge>
        </div>
        {!readOnly && (
          <div className="text-xs text-muted-foreground">
            Drag to reorder
          </div>
        )}
      </div>

      <Reorder.Group
        axis="y"
        values={steps}
        onReorder={readOnly ? () => {} : handleReorder}
        className="space-y-2"
      >
        {steps.map((step, index) => (
          <Reorder.Item
            key={step.id}
            value={step}
            drag={!readOnly && editingId !== step.id ? true : false}
          >
            <StepItem
              step={step}
              index={index}
              isEditing={editingId === step.id}
              onEdit={() => setEditingId(step.id)}
              onSave={handleSaveStep}
              onCancel={() => {
                if (!step.action && !step.expectedResult) {
                  handleDeleteStep(step.id);
                }
                setEditingId(null);
              }}
              onDelete={() => handleDeleteStep(step.id)}
              onDuplicate={() => handleDuplicateStep(step)}
              readOnly={readOnly}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {!readOnly && !editingId && (
        <motion.div layout>
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddNewStep}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Step
          </Button>
        </motion.div>
      )}
    </div>
  );
}
