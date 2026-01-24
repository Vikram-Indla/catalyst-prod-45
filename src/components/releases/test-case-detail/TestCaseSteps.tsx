/**
 * Test Case Steps Component — Fully wired to DB
 * All CRUD operations persist to tm_test_steps
 * AI Generate Steps enabled via edge function
 */

import { useState, useEffect, useCallback } from 'react';
import { getEstimatedDurationDisplay } from '@/utils/test-case-duration';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  GripVertical, 
  Plus, 
  Sparkles, 
  MoreHorizontal,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Paperclip,
  Upload,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  useAddTestStep, 
  useUpdateTestStep, 
  useDeleteTestStep,
  useReorderTestSteps,
  useDuplicateTestStep,
} from '@/hooks/test-management/useTestSteps';
import type { TMCaseStep } from '@/types/test-management';

interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
  test_data?: string;
  attachments?: { id: string; name: string }[];
}

interface TestCaseStepsProps {
  testCaseId: string;
  steps: TMCaseStep[];
  testCaseTitle?: string;
  testCaseType?: string;
}

// Convert DB step format to UI format
function mapDbStepsToUi(dbSteps: TMCaseStep[]): TestStep[] {
  return dbSteps.map(s => ({
    id: s.id,
    action: s.action,
    expectedResult: s.expected_result,
    test_data: s.test_data,
    attachments: [],
  }));
}

export function TestCaseSteps({ testCaseId, steps: dbSteps, testCaseTitle, testCaseType }: TestCaseStepsProps) {
  const [steps, setSteps] = useState<TestStep[]>(mapDbStepsToUi(dbSteps));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ action: '', expectedResult: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState({ action: '', expectedResult: '' });
  
  // AI Generate dialog state
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Sync local state when DB data changes
  useEffect(() => {
    setSteps(mapDbStepsToUi(dbSteps));
  }, [dbSteps]);

  // Pre-populate AI prompt with test case info
  useEffect(() => {
    if (testCaseTitle && showAIDialog) {
      setAiPrompt(testCaseTitle);
    }
  }, [testCaseTitle, showAIDialog]);

  // Mutations
  const addStepMutation = useAddTestStep();
  const updateStepMutation = useUpdateTestStep();
  const deleteStepMutation = useDeleteTestStep();
  const reorderStepsMutation = useReorderTestSteps();
  const duplicateStepMutation = useDuplicateTestStep();

  const handleAddStep = async () => {
    if (newStep.action.trim() && newStep.expectedResult.trim()) {
      try {
        await addStepMutation.mutateAsync({
          test_case_id: testCaseId,
          step_number: steps.length + 1,
          action: newStep.action,
          expected_result: newStep.expectedResult,
        });
        
        setNewStep({ action: '', expectedResult: '' });
        setShowAddForm(false);
        toast.success('Step added successfully');
      } catch (error) {
        toast.error('Failed to add step');
      }
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to test');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-test-cases', {
        body: {
          prompt: aiPrompt,
          projectName: 'Test Project',
          testType: testCaseType || 'functional',
          includeEdgeCases: true,
          includeNegativeTests: false,
          includePerformance: false,
          includeSecurity: false,
        },
      });

      if (error) {
        // Handle rate limiting and payment errors
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          toast.error('Rate limit exceeded', { description: 'Please try again in a moment.' });
          return;
        }
        if (error.message?.includes('402') || error.message?.includes('payment')) {
          toast.error('AI credits exhausted', { description: 'Please add credits to continue using AI features.' });
          return;
        }
        throw new Error(error.message);
      }
      
      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('rate')) {
          toast.error('Rate limit exceeded', { description: 'Please try again in a moment.' });
          return;
        }
        if (data.error.includes('402') || data.error.includes('payment')) {
          toast.error('AI credits exhausted', { description: 'Please add credits to continue using AI features.' });
          return;
        }
        throw new Error(data.error);
      }

      // Extract steps from the first generated test case
      const generatedTestCase = data?.data?.testCases?.[0];
      const generatedSteps = generatedTestCase?.steps || [];

      if (generatedSteps.length === 0) {
        toast.error('No steps were generated. Try a more detailed description.');
        return;
      }

      // Insert each generated step into the database
      let insertedCount = 0;
      for (let i = 0; i < generatedSteps.length; i++) {
        const step = generatedSteps[i];
        try {
          await addStepMutation.mutateAsync({
            test_case_id: testCaseId,
            step_number: steps.length + i + 1,
            action: step.action || '',
            expected_result: step.expectedResult || '',
            test_data: step.testData || undefined,
          });
          insertedCount++;
        } catch (err) {
          console.error('Failed to insert step:', err);
        }
      }

      if (insertedCount > 0) {
        toast.success(`AI generated ${insertedCount} test steps`);
        setShowAIDialog(false);
        setAiPrompt('');
      } else {
        toast.error('Failed to save generated steps');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate steps';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteStepMutation.mutateAsync({
        id: stepId,
        test_case_id: testCaseId,
      });
    } catch (error) {
      toast.error('Failed to delete step');
    }
  };

  const handleDuplicateStep = async (step: TestStep) => {
    try {
      await duplicateStepMutation.mutateAsync({
        stepId: step.id,
        test_case_id: testCaseId,
      });
    } catch (error) {
      toast.error('Failed to duplicate step');
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    
    // Optimistically update UI
    setSteps(newSteps);
    
    // Persist to DB
    try {
      await reorderStepsMutation.mutateAsync({
        test_case_id: testCaseId,
        stepIds: newSteps.map(s => s.id),
      });
    } catch (error) {
      // Revert on error
      setSteps(mapDbStepsToUi(dbSteps));
      toast.error('Failed to reorder steps');
    }
  };

  const handleReorder = useCallback(async (newOrder: TestStep[]) => {
    // Optimistically update UI
    setSteps(newOrder);
    
    // Persist to DB
    try {
      await reorderStepsMutation.mutateAsync({
        test_case_id: testCaseId,
        stepIds: newOrder.map(s => s.id),
      });
    } catch (error) {
      // Revert on error
      setSteps(mapDbStepsToUi(dbSteps));
    }
  }, [testCaseId, reorderStepsMutation, dbSteps]);

  const startEditing = (step: TestStep) => {
    setEditingStepId(step.id);
    setEditingStep({ action: step.action, expectedResult: step.expectedResult });
  };

  const saveEdit = async () => {
    if (editingStep.action.trim() && editingStep.expectedResult.trim() && editingStepId) {
      try {
        await updateStepMutation.mutateAsync({
          id: editingStepId,
          test_case_id: testCaseId,
          action: editingStep.action,
          expected_result: editingStep.expectedResult,
        });
        setEditingStepId(null);
        toast.success('Step updated');
      } catch (error) {
        toast.error('Failed to update step');
      }
    }
  };

  const cancelEdit = () => {
    setEditingStepId(null);
    setEditingStep({ action: '', expectedResult: '' });
  };

  const estimatedTime = getEstimatedDurationDisplay({ steps });

  return (
    <div className="space-y-4">
      {/* Steps Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Test Steps</h3>
          <p className="text-sm text-muted-foreground">
            {steps.length} step{steps.length !== 1 ? 's' : ''} · Est. {estimatedTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={() => setShowAIDialog(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                AI Generate Steps
              </>
            )}
          </Button>
          <Button size="sm" className="h-8" onClick={() => setShowAddForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {steps.length === 0 && !showAddForm && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No test steps defined yet</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowAIDialog(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
              AI Generate Steps
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Step
            </Button>
          </div>
        </div>
      )}

      {/* Steps List with Reorder */}
      {steps.length > 0 && (
        <Reorder.Group 
          axis="y" 
          values={steps} 
          onReorder={handleReorder}
          className="space-y-3"
        >
          {steps.map((step, index) => (
            <Reorder.Item key={step.id} value={step}>
              <StepCard 
                step={step} 
                index={index}
                isEditing={editingStepId === step.id}
                editingStep={editingStep}
                onEditingStepChange={setEditingStep}
                onStartEdit={() => startEditing(step)}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={() => handleDeleteStep(step.id)}
                onDuplicate={() => handleDuplicateStep(step)}
                onMoveUp={() => handleMoveStep(step.id, 'up')}
                onMoveDown={() => handleMoveStep(step.id, 'down')}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                isUpdating={updateStepMutation.isPending && editingStepId === step.id}
                isDeleting={deleteStepMutation.isPending}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Add Step Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex gap-4 p-4 bg-card border border-border rounded-lg border-dashed border-primary/50">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                {steps.length + 1}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Action <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe the action to perform..."
                    className="min-h-[80px]"
                    value={newStep.action}
                    onChange={(e) => setNewStep({ ...newStep, action: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Expected Result <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe the expected outcome..."
                    className="min-h-[80px]"
                    value={newStep.expectedResult}
                    onChange={(e) => setNewStep({ ...newStep, expectedResult: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Attachments
                  </label>
                  <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop files or{' '}
                      <span className="text-primary cursor-pointer hover:underline">browse</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewStep({ action: '', expectedResult: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleAddStep}
                    disabled={!newStep.action.trim() || !newStep.expectedResult.trim() || addStepMutation.isPending}
                  >
                    {addStepMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Step
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Generate Test Steps
            </DialogTitle>
            <DialogDescription>
              Describe what you want to test and AI will generate detailed test steps.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What do you want to test?
              </label>
              <Textarea
                placeholder="e.g., User login with valid credentials, password reset flow, form validation..."
                className="min-h-[120px]"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Be specific about the functionality, user actions, and expected behaviors.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                setAiPrompt('');
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Steps
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StepCardProps {
  step: TestStep;
  index: number;
  isEditing: boolean;
  editingStep: { action: string; expectedResult: string };
  onEditingStepChange: (step: { action: string; expectedResult: string }) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

function StepCard({ 
  step, 
  index, 
  isEditing,
  editingStep,
  onEditingStepChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isUpdating,
  isDeleting,
}: StepCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-sm hover:border-primary/30 transition-all group"
    >
      {/* Drag Handle */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="cursor-grab hover:bg-muted rounded p-1 text-muted-foreground active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>
        {/* Step Number */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {index + 1}
        </div>
      </div>

      {/* Step Content */}
      {isEditing ? (
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Action
            </label>
            <Textarea
              value={editingStep.action}
              onChange={(e) => onEditingStepChange({ ...editingStep, action: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Expected Result
            </label>
            <Textarea
              value={editingStep.expectedResult}
              onChange={(e) => onEditingStepChange({ ...editingStep, expectedResult: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={isUpdating}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveEdit} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 space-y-3">
          {/* Action */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Action
            </span>
            <p className="text-sm text-foreground mt-1">{step.action}</p>
          </div>

          {/* Expected Result */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Expected Result
            </span>
            <p className="text-sm text-foreground mt-1">{step.expectedResult}</p>
          </div>

          {/* Attachments */}
          {step.attachments && step.attachments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {step.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{att.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions Menu */}
      {!isEditing && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onStartEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onMoveUp} disabled={isFirst}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown} disabled={isLast}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete} 
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}
