/**
 * Step Editor Component - Section 3
 * Drag-and-drop step editor with inline editing
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TestStepDetail, CreateStepForm } from '../../../types/test-case-detail';

// =============================================
// SORTABLE STEP ITEM
// =============================================

interface SortableStepProps {
  step: TestStepDetail;
  index: number;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (data: Partial<CreateStepForm>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableStep({
  step,
  index,
  isEditing,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
}: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [localAction, setLocalAction] = useState(step.action);
  const [localExpected, setLocalExpected] = useState(step.expectedResult);
  const [localTestData, setLocalTestData] = useState(step.testData || '');

  const handleBlur = useCallback(() => {
    if (
      localAction !== step.action ||
      localExpected !== step.expectedResult ||
      localTestData !== (step.testData || '')
    ) {
      onUpdate({
        action: localAction,
        expectedResult: localExpected,
        testData: localTestData || undefined,
      });
    }
  }, [localAction, localExpected, localTestData, step, onUpdate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white border border-slate-200 rounded-lg transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isEditing && 'hover:border-blue-300'
      )}
    >
      {/* Step Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        {/* Drag Handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Step Number */}
        <div className="flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
          {index + 1}
        </div>

        {/* Action Preview */}
        <div className="flex-1 min-w-0">
          {isEditing && isExpanded ? (
            <Input
              value={localAction}
              onChange={(e) => setLocalAction(e.target.value)}
              onBlur={handleBlur}
              placeholder="Action"
              className="h-8 text-sm"
            />
          ) : (
            <p className="text-sm text-slate-700 truncate">{step.action}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDuplicate}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-slate-50/50">
          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Action
            </label>
            {isEditing ? (
              <Textarea
                value={localAction}
                onChange={(e) => setLocalAction(e.target.value)}
                onBlur={handleBlur}
                placeholder="Describe the action to perform..."
                className="min-h-[60px] text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {step.action}
              </p>
            )}
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Expected Result
            </label>
            {isEditing ? (
              <Textarea
                value={localExpected}
                onChange={(e) => setLocalExpected(e.target.value)}
                onBlur={handleBlur}
                placeholder="Describe the expected result..."
                className="min-h-[60px] text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {step.expectedResult}
              </p>
            )}
          </div>

          {/* Test Data */}
          {(isEditing || step.testData) && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Test Data (Optional)
              </label>
              {isEditing ? (
                <Textarea
                  value={localTestData}
                  onChange={(e) => setLocalTestData(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Enter test data..."
                  className="min-h-[40px] text-sm font-mono"
                />
              ) : (
                <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap">
                  {step.testData}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// STEP EDITOR MAIN
// =============================================

interface StepEditorProps {
  steps: TestStepDetail[];
  isEditing: boolean;
  onAddStep: (data: CreateStepForm) => void;
  onUpdateStep: (stepId: string, data: Partial<CreateStepForm>) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onReorderSteps: (stepIds: string[]) => void;
}

export function StepEditor({
  steps,
  isEditing,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onDuplicateStep,
  onReorderSteps,
}: StepEditorProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [newStep, setNewStep] = useState<CreateStepForm>({
    action: '',
    expectedResult: '',
    notes: null,
    testData: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(steps, oldIndex, newIndex);
      onReorderSteps(newOrder.map((s) => s.id));
    }
  };

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const handleAddStep = () => {
    if (newStep.action && newStep.expectedResult) {
      onAddStep(newStep);
      setNewStep({
        action: '',
        expectedResult: '',
        notes: null,
        testData: null,
      });
      setIsAddingStep(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Steps List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {steps.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                isEditing={isEditing}
                isExpanded={expandedSteps.has(step.id)}
                onToggleExpand={() => toggleExpand(step.id)}
                onUpdate={(data) => onUpdateStep(step.id, data)}
                onDelete={() => setStepToDelete(step.id)}
                onDuplicate={() => onDuplicateStep(step.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {steps.length === 0 && !isAddingStep && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No steps defined yet.</p>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setIsAddingStep(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add First Step
            </Button>
          )}
        </div>
      )}

      {/* Add Step Form */}
      {isEditing && isAddingStep && (
        <div className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
              {steps.length + 1}
            </div>
            <span className="text-sm font-medium text-blue-700">New Step</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Action *
            </label>
            <Textarea
              value={newStep.action}
              onChange={(e) =>
                setNewStep((prev) => ({ ...prev, action: e.target.value }))
              }
              placeholder="Describe the action to perform..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Expected Result *
            </label>
            <Textarea
              value={newStep.expectedResult}
              onChange={(e) =>
                setNewStep((prev) => ({
                  ...prev,
                  expectedResult: e.target.value,
                }))
              }
              placeholder="Describe the expected result..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Test Data (Optional)
            </label>
            <Textarea
              value={newStep.testData || ''}
              onChange={(e) =>
                setNewStep((prev) => ({
                  ...prev,
                  testData: e.target.value || null,
                }))
              }
              placeholder="Enter test data..."
              className="min-h-[40px] text-sm font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAddStep}
              disabled={!newStep.action || !newStep.expectedResult}
            >
              <Save className="w-4 h-4 mr-1" />
              Add Step
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingStep(false);
                setNewStep({
                  action: '',
                  expectedResult: '',
                  notes: null,
                  testData: null,
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Step Button */}
      {isEditing && !isAddingStep && steps.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setIsAddingStep(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Step
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Step?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Step{' '}
              {stepToDelete ? steps.findIndex(s => s.id === stepToDelete) + 1 : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (stepToDelete) {
                  onDeleteStep(stepToDelete);
                  setStepToDelete(null);
                }
              }}
            >
              Delete Step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
