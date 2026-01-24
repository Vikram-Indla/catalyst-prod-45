/**
 * Test Case Steps Component — Wired to real DB data
 * Displays and manages test steps with full interactivity
 */

import { useState } from 'react';
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
import { useAddTestStep } from '@/hooks/test-management/useTestSteps';
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

export function TestCaseSteps({ testCaseId, steps: dbSteps }: TestCaseStepsProps) {
  const [steps, setSteps] = useState<TestStep[]>(mapDbStepsToUi(dbSteps));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ action: '', expectedResult: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState({ action: '', expectedResult: '' });

  // Add step mutation
  const addStepMutation = useAddTestStep();

  const handleAddStep = async () => {
    if (newStep.action.trim() && newStep.expectedResult.trim()) {
      try {
        await addStepMutation.mutateAsync({
          test_case_id: testCaseId,
          step_number: steps.length + 1,
          action: newStep.action,
          expected_result: newStep.expectedResult,
        });
        
        // Optimistically add to local state
        const step: TestStep = {
          id: `step-${Date.now()}`,
          action: newStep.action,
          expectedResult: newStep.expectedResult,
          attachments: [],
        };
        setSteps([...steps, step]);
        setNewStep({ action: '', expectedResult: '' });
        setShowAddForm(false);
        toast.success('Step added successfully');
      } catch (error) {
        toast.error('Failed to add step');
      }
    }
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    // AI generation disabled until module is implemented
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsGenerating(false);
    toast.info('AI step generation not enabled yet', {
      description: 'This feature will be available in a future release.',
    });
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
    toast.info('Step deleted locally (DB sync pending)');
  };

  const handleDuplicateStep = (step: TestStep) => {
    const newStep: TestStep = { ...step, id: `step-${Date.now()}` };
    const index = steps.findIndex(s => s.id === step.id);
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, newStep);
    setSteps(newSteps);
    toast.info('Step duplicated locally (DB sync pending)');
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
    toast.info(`Step moved ${direction} (DB sync pending)`);
  };

  const startEditing = (step: TestStep) => {
    setEditingStepId(step.id);
    setEditingStep({ action: step.action, expectedResult: step.expectedResult });
  };

  const saveEdit = () => {
    if (editingStep.action.trim() && editingStep.expectedResult.trim()) {
      setSteps(steps.map(s => 
        s.id === editingStepId 
          ? { ...s, action: editingStep.action, expectedResult: editingStep.expectedResult }
          : s
      ));
      setEditingStepId(null);
      toast.info('Step updated locally (DB sync pending)');
    }
  };

  const cancelEdit = () => {
    setEditingStepId(null);
    setEditingStep({ action: '', expectedResult: '' });
  };

  const estimatedTime = `${Math.max(steps.length * 0.5 + 2, 1)} min`;

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={handleAIGenerate}
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
            </TooltipTrigger>
            <TooltipContent>AI step generation not enabled yet</TooltipContent>
          </Tooltip>
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
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Step
          </Button>
        </div>
      )}

      {/* Steps List with Reorder */}
      {steps.length > 0 && (
        <Reorder.Group 
          axis="y" 
          values={steps} 
          onReorder={setSteps}
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
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveEdit}>
              <Check className="w-4 h-4 mr-1" />
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
            <div className="flex flex-wrap gap-2 pt-1">
              {step.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Paperclip className="w-3 h-3" />
                  {att.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
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
              <DropdownMenuItem onClick={onMoveUp} disabled={isFirst}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown} disabled={isLast}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
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
