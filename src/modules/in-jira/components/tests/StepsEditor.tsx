/**
 * Steps Editor Component
 * Inline add/edit rows with drag-drop reorder and shared step insertion
 */

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Check,
  X,
  Link2,
  Library,
  Loader2,
  ChevronDown,
  Paperclip,
  MoreHorizontal,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTestSteps,
  useSharedSteps,
  TestStep,
  CreateStepInput,
  UpdateStepInput,
} from '../../hooks/useTestSteps';

interface StepsEditorProps {
  testCaseId: string;
  readOnly?: boolean;
}

interface EditingStep {
  id: string | null; // null means new step
  description: string;
  expected_result: string;
  test_data: string;
}

export function StepsEditor({ testCaseId, readOnly = false }: StepsEditorProps) {
  const {
    steps,
    isLoading,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    isCreating,
    isUpdating,
  } = useTestSteps(testCaseId);

  const {
    sharedSteps,
    isLoading: isLoadingShared,
    linkToTestCase,
  } = useSharedSteps();

  const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
  const [showSharedStepPicker, setShowSharedStepPicker] = useState(false);
  const [insertAtPosition, setInsertAtPosition] = useState<number>(0);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || result.destination.index === result.source.index) {
        return;
      }

      const reorderedSteps = Array.from(steps);
      const [movedStep] = reorderedSteps.splice(result.source.index, 1);
      reorderedSteps.splice(result.destination.index, 0, movedStep);

      // Create reorder input
      const reorders = reorderedSteps.map((step, index) => ({
        id: step.id,
        new_step_number: index + 1,
      }));

      try {
        await reorderSteps(reorders);
      } catch (err) {
        console.error('Failed to reorder steps:', err);
      }
    },
    [steps, reorderSteps]
  );

  // Start adding new step
  const handleAddStep = useCallback((position?: number) => {
    const pos = position ?? steps.length + 1;
    setInsertAtPosition(pos);
    setEditingStep({
      id: null,
      description: '',
      expected_result: '',
      test_data: '',
    });
  }, [steps.length]);

  // Start editing existing step
  const handleEditStep = useCallback((step: TestStep) => {
    if (step.shared_step_id) {
      // Can't edit shared steps inline
      return;
    }
    setEditingStep({
      id: step.id,
      description: step.description,
      expected_result: step.expected_result || '',
      test_data: step.test_data || '',
    });
  }, []);

  // Save step (create or update)
  const handleSaveStep = useCallback(async () => {
    if (!editingStep || !editingStep.description.trim()) return;

    try {
      if (editingStep.id === null) {
        // Create new step
        const input: CreateStepInput = {
          case_id: testCaseId,
          step_number: insertAtPosition,
          description: editingStep.description.trim(),
          expected_result: editingStep.expected_result.trim() || undefined,
          test_data: editingStep.test_data.trim() || undefined,
        };
        await createStep(input);
      } else {
        // Update existing step
        const input: UpdateStepInput = {
          id: editingStep.id,
          description: editingStep.description.trim(),
          expected_result: editingStep.expected_result.trim() || undefined,
          test_data: editingStep.test_data.trim() || undefined,
        };
        await updateStep(input);
      }
      setEditingStep(null);
    } catch (err) {
      console.error('Failed to save step:', err);
    }
  }, [editingStep, testCaseId, insertAtPosition, createStep, updateStep]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingStep(null);
  }, []);

  // Delete step
  const handleDeleteStep = useCallback(async (stepId: string) => {
    try {
      await deleteStep(stepId);
    } catch (err) {
      console.error('Failed to delete step:', err);
    }
  }, [deleteStep]);

  // Insert shared step
  const handleInsertSharedStep = useCallback(async (sharedStepId: string) => {
    try {
      await linkToTestCase({
        testCaseId,
        sharedStepId,
        stepOrder: insertAtPosition,
      });
      setShowSharedStepPicker(false);
    } catch (err) {
      console.error('Failed to insert shared step:', err);
    }
  }, [testCaseId, insertAtPosition, linkToTestCase]);

  // Open shared step picker
  const handleOpenSharedStepPicker = useCallback((position: number) => {
    setInsertAtPosition(position);
    setShowSharedStepPicker(true);
  }, []);

  // Duplicate step
  const handleDuplicateStep = useCallback(async (step: TestStep) => {
    if (step.shared_step_id) return;
    
    const input: CreateStepInput = {
      case_id: testCaseId,
      step_number: steps.length + 1,
      description: step.description,
      expected_result: step.expected_result || undefined,
      test_data: step.test_data || undefined,
    };
    await createStep(input);
  }, [testCaseId, steps.length, createStep]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary font-medium">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </span>
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAddStep()}>
                <Plus className="h-4 w-4 mr-2" />
                New Step
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenSharedStepPicker(steps.length + 1)}>
                <Library className="h-4 w-4 mr-2" />
                Insert Shared Step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Steps List */}
      {steps.length === 0 && editingStep === null ? (
        <div className="text-center py-12 bg-surface-2 rounded-lg border border-border-default">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-surface-3 flex items-center justify-center">
            <Plus className="h-6 w-6 text-text-quaternary" />
          </div>
          <p className="text-sm text-text-secondary mb-3">No steps defined yet</p>
          {!readOnly && (
            <Button size="sm" onClick={() => handleAddStep()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Step
            </Button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps-list" isDropDisabled={readOnly}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'space-y-2 min-h-[100px]',
                  snapshot.isDraggingOver && 'bg-accent-subtle/30 rounded-lg'
                )}
              >
                {steps.map((step, index) => (
                  <Draggable
                    key={step.id}
                    draggableId={step.id}
                    index={index}
                    isDragDisabled={readOnly || editingStep?.id === step.id}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'group relative',
                          snapshot.isDragging && 'opacity-90'
                        )}
                      >
                        {editingStep?.id === step.id ? (
                          // Editing mode
                          <StepEditForm
                            editingStep={editingStep}
                            setEditingStep={setEditingStep}
                            onSave={handleSaveStep}
                            onCancel={handleCancelEdit}
                            isSaving={isUpdating}
                            stepNumber={index + 1}
                          />
                        ) : (
                          // View mode
                          <StepCard
                            step={step}
                            stepNumber={index + 1}
                            dragHandleProps={provided.dragHandleProps}
                            readOnly={readOnly}
                            onEdit={() => handleEditStep(step)}
                            onDelete={() => handleDeleteStep(step.id)}
                            onDuplicate={() => handleDuplicateStep(step)}
                            onInsertBelow={() => handleAddStep(index + 2)}
                            onInsertSharedBelow={() => handleOpenSharedStepPicker(index + 2)}
                          />
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* New step form at bottom */}
                {editingStep?.id === null && (
                  <StepEditForm
                    editingStep={editingStep}
                    setEditingStep={setEditingStep}
                    onSave={handleSaveStep}
                    onCancel={handleCancelEdit}
                    isSaving={isCreating}
                    stepNumber={insertAtPosition}
                    isNew
                  />
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Shared Step Picker Dialog */}
      <Dialog open={showSharedStepPicker} onOpenChange={setShowSharedStepPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Insert Shared Step</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {isLoadingShared ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
              </div>
            ) : sharedSteps.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <Library className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No shared steps available</p>
                <p className="text-xs mt-1">Create shared steps in the Step Library</p>
              </div>
            ) : (
              sharedSteps.map(ss => (
                <div
                  key={ss.id}
                  className="p-3 rounded-lg border border-border-default hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => handleInsertSharedStep(ss.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{ss.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {ss.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {ss.usage_count || 0} uses
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSharedStepPicker(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Step Card Component
interface StepCardProps {
  step: TestStep;
  stepNumber: number;
  dragHandleProps: any;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertBelow: () => void;
  onInsertSharedBelow: () => void;
}

function StepCard({
  step,
  stepNumber,
  dragHandleProps,
  readOnly,
  onEdit,
  onDelete,
  onDuplicate,
  onInsertBelow,
  onInsertSharedBelow,
}: StepCardProps) {
  const isShared = !!step.shared_step_id;

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border transition-colors',
        isShared
          ? 'bg-accent-subtle/30 border-accent-primary/30'
          : 'bg-surface-2 border-border-default',
        !readOnly && 'hover:border-border-hover'
      )}
    >
      {/* Drag handle + number */}
      <div className="flex items-start gap-2 pt-0.5">
        {!readOnly && (
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-text-quaternary" />
          </div>
        )}
        <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-text-secondary shrink-0">
          {stepNumber}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <p className="text-sm text-text-primary flex-1">{step.description}</p>
          {isShared && (
            <Badge variant="outline" className="shrink-0 text-xs bg-accent-subtle/50">
              <Link2 className="h-3 w-3 mr-1" />
              Shared
            </Badge>
          )}
        </div>
        
        {step.expected_result && (
          <p className="text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">Expected:</span>{' '}
            {step.expected_result}
          </p>
        )}
        
        {step.test_data && (
          <p className="text-xs text-text-quaternary">
            <span className="font-medium">Data:</span> {step.test_data}
          </p>
        )}

        {step.attachment_urls && step.attachment_urls.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <Paperclip className="h-3 w-3" />
            {step.attachment_urls.length} attachment{step.attachment_urls.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Actions */}
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isShared && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onInsertBelow}>
              <Plus className="h-4 w-4 mr-2" />
              Insert Step Below
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertSharedBelow}>
              <Library className="h-4 w-4 mr-2" />
              Insert Shared Below
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-status-error">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Step Edit Form Component
interface StepEditFormProps {
  editingStep: EditingStep;
  setEditingStep: React.Dispatch<React.SetStateAction<EditingStep | null>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  stepNumber: number;
  isNew?: boolean;
}

function StepEditForm({
  editingStep,
  setEditingStep,
  onSave,
  onCancel,
  isSaving,
  stepNumber,
  isNew,
}: StepEditFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="p-3 rounded-lg border-2 border-accent-primary bg-surface-1 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center text-xs font-medium text-white shrink-0 mt-1">
          {stepNumber}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Action / Description *
            </label>
            <Textarea
              value={editingStep.description}
              onChange={e =>
                setEditingStep(prev => prev ? { ...prev, description: e.target.value } : null)
              }
              onKeyDown={handleKeyDown}
              placeholder="Describe the step action..."
              className="min-h-[60px] text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Expected Result
            </label>
            <Textarea
              value={editingStep.expected_result}
              onChange={e =>
                setEditingStep(prev => prev ? { ...prev, expected_result: e.target.value } : null)
              }
              onKeyDown={handleKeyDown}
              placeholder="What should happen..."
              className="min-h-[40px] text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Test Data
            </label>
            <Input
              value={editingStep.test_data}
              onChange={e =>
                setEditingStep(prev => prev ? { ...prev, test_data: e.target.value } : null)
              }
              onKeyDown={handleKeyDown}
              placeholder="Input data for this step..."
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <span className="text-xs text-text-quaternary mr-2">⌘+Enter to save</span>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!editingStep.description.trim() || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          {isNew ? 'Add Step' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export default StepsEditor;
