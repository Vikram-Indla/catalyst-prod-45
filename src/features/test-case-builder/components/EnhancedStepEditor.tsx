// =====================================================
// ENHANCED STEP EDITOR
// Full step editor with drag-drop reordering
// =====================================================

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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Undo2, List } from 'lucide-react';
import { DraggableStepRow } from './DraggableStepRow';
import { EditorStep, createEmptyStep } from '../types/step-editor';
import {
  useCaseSteps,
  useReorderSteps,
  useCloneStep,
  useInsertStep,
  useDeleteStep,
  useUpdateStep,
} from '@/hooks/test-cases/useEnhancedSteps';
import { cn } from '@/lib/utils';

interface EnhancedStepEditorProps {
  caseId: string;
  readOnly?: boolean;
}

export function EnhancedStepEditor({ caseId, readOnly }: EnhancedStepEditorProps) {
  const { data: dbSteps = [], isLoading } = useCaseSteps(caseId);
  const reorderSteps = useReorderSteps();
  const cloneStep = useCloneStep();
  const insertStep = useInsertStep();
  const deleteStep = useDeleteStep();
  const updateStep = useUpdateStep();

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [localSteps, setLocalSteps] = useState<EditorStep[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Sync local state with DB
  React.useEffect(() => {
    if (dbSteps.length > 0 && !hasLocalChanges) {
      setLocalSteps(
        dbSteps.map((s) => ({
          ...s,
          action: s.action || '',
          expected_result: s.expected_result || '',
          test_data: s.test_data || '',
          notes: s.notes || '',
          is_optional: s.is_optional || false,
          step_type: (s.step_type as EditorStep['step_type']) || 'action',
        }))
      );
    }
  }, [dbSteps, hasLocalChanges]);

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = localSteps.findIndex((s) => s.id === active.id);
        const newIndex = localSteps.findIndex((s) => s.id === over.id);

        const reordered = arrayMove(localSteps, oldIndex, newIndex).map((s, i) => ({
          ...s,
          step_number: i + 1,
        }));

        setLocalSteps(reordered);

        // Persist to DB
        const stepOrders = reordered.map((s) => ({
          step_id: s.id,
          new_order: s.step_number,
        }));

        reorderSteps.mutate({ caseId, stepOrders });
      }
    },
    [localSteps, caseId, reorderSteps]
  );

  const toggleExpand = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleUpdateStep = (stepId: string, updates: Partial<EditorStep>) => {
    setLocalSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );

    // Don't persist temp steps
    if (!stepId.startsWith('temp-')) {
      updateStep.mutate({ stepId, caseId, updates });
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (stepId.startsWith('temp-')) {
      setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
    } else {
      deleteStep.mutate({ stepId, caseId });
    }
  };

  const handleCloneStep = (stepId: string, stepNumber: number) => {
    if (stepId.startsWith('temp-')) {
      // Clone local temp step
      const sourceStep = localSteps.find((s) => s.id === stepId);
      if (sourceStep) {
        const newStep = createEmptyStep(stepNumber + 1);
        newStep.action = sourceStep.action;
        newStep.expected_result = sourceStep.expected_result;
        newStep.test_data = sourceStep.test_data;
        newStep.step_type = sourceStep.step_type;
        setLocalSteps((prev) => {
          const idx = prev.findIndex((s) => s.id === stepId);
          const updated = [...prev];
          updated.splice(idx + 1, 0, newStep);
          return updated.map((s, i) => ({ ...s, step_number: i + 1 }));
        });
      }
    } else {
      cloneStep.mutate({ stepId, insertAfter: stepNumber, caseId });
    }
  };

  const handleInsertAfter = (stepNumber: number) => {
    const newStep = createEmptyStep(stepNumber + 1);
    setLocalSteps((prev) => {
      const idx = prev.findIndex((s) => s.step_number === stepNumber);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newStep);
      return updated.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    setExpandedSteps((prev) => new Set(prev).add(newStep.id));
  };

  const handleAddStep = () => {
    const newStep = createEmptyStep(localSteps.length + 1);
    setLocalSteps((prev) => [...prev, newStep]);
    setExpandedSteps((prev) => new Set(prev).add(newStep.id));
  };

  const handleSaveNewSteps = async () => {
    const tempSteps = localSteps.filter((s) => s.id.startsWith('temp-'));
    
    for (const step of tempSteps) {
      await insertStep.mutateAsync({
        caseId,
        position: step.step_number,
        stepType: step.step_type,
        action: step.action,
        expectedResult: step.expected_result,
        testData: step.test_data || undefined,
      });
    }
    
    setHasLocalChanges(false);
  };

  const hasTempSteps = localSteps.some((s) => s.id.startsWith('temp-'));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            Test Steps
          </CardTitle>
          <Badge variant="secondary">{localSteps.length} steps</Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasTempSteps && (
            <Button
              size="sm"
              onClick={handleSaveNewSteps}
              disabled={insertStep.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save New Steps
            </Button>
          )}
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {localSteps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No steps defined yet</p>
            <Button variant="outline" className="mt-4" onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Step
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localSteps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localSteps.map((step, index) => (
                  <DraggableStepRow
                    key={step.id}
                    step={step}
                    index={index}
                    isExpanded={expandedSteps.has(step.id)}
                    onToggleExpand={() => toggleExpand(step.id)}
                    onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                    onDelete={() => handleDeleteStep(step.id)}
                    onClone={() => handleCloneStep(step.id, step.step_number)}
                    onInsertAfter={() => handleInsertAfter(step.step_number)}
                    disabled={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
