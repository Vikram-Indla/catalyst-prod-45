/**
 * Steps Tab Component
 * Tab 2: Classic & BDD/Gherkin step editing
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Check,
  Sparkles,
  FileText,
  Paperclip,
  ClipboardCopy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lozenge } from '@/components/ads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TestCaseFormData, TestCaseStep, StepMode } from './types';

interface StepsTabProps {
  data: TestCaseFormData;
  onChange: (updates: Partial<TestCaseFormData>) => void;
  onOpenTemplates: () => void;
  onOpenAIGenerate: () => void;
}

function StepCard({
  step,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  step: TestCaseStep;
  index: number;
  onUpdate: (step: TestCaseStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isComplete = Boolean(step.action && step.expectedResult);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group border rounded-lg transition-all bg-card",
        "hover:border-slate-300 hover:shadow-md",
        !isComplete && "border-amber-300 bg-amber-50/30 dark:bg-amber-900/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50/50 dark:bg-slate-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
            {index + 1}
          </div>
          <Lozenge appearance={isComplete ? 'success' : 'moved'}>
            {isComplete ? 'Complete' : 'Incomplete'}
          </Lozenge>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDuplicate}
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Action */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Action <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={step.action}
            onChange={(e) => onUpdate({ ...step, action: e.target.value, isComplete: Boolean(e.target.value && step.expectedResult) })}
            placeholder="Describe the action to perform..."
            className={cn(
              "min-h-[60px] resize-none transition-all",
              step.action ? "border-teal-500 bg-white" : "bg-slate-50"
            )}
          />
        </div>

        {/* Test Data */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Test Data
          </label>
          <Input
            value={step.testData || ''}
            onChange={(e) => onUpdate({ ...step, testData: e.target.value })}
            placeholder="Enter test data if needed..."
            className="font-mono text-sm"
          />
        </div>

        {/* Expected Result */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Expected Result <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={step.expectedResult}
            onChange={(e) => onUpdate({ ...step, expectedResult: e.target.value, isComplete: Boolean(step.action && e.target.value) })}
            placeholder="Describe the expected outcome..."
            className={cn(
              "min-h-[60px] resize-none transition-all",
              step.expectedResult ? "border-teal-500 bg-white" : "bg-slate-50"
            )}
          />
        </div>

        {/* Attachments */}
        <div className="pt-2 border-t border-dashed">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Attachments
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
          {step.attachments.length > 0 ? (
            <div className="flex gap-2 mt-2">
              {step.attachments.map((att) => (
                <div key={att.id} className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function BDDEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['Given', 'When', 'Then', 'And'].map((keyword) => (
          <Button
            key={keyword}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(content + `\n    ${keyword} `)}
          >
            {keyword}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Feature: User Login
  As a registered user
  I want to login with valid credentials
  So that I can access my dashboard

  Scenario: Successful login
    Given I am on the login page
    When I enter username "{{username}}"
    And I enter password "{{password}}"
    Then I should be redirected to dashboard`}
          className="min-h-[300px] font-mono text-sm bg-slate-900 text-slate-200 resize-none"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        />
      </div>
    </div>
  );
}

export function StepsTab({ data, onChange, onOpenTemplates, onOpenAIGenerate }: StepsTabProps) {
  const [stepMode, setStepMode] = useState<StepMode>(data.stepMode);

  const handleAddStep = useCallback(() => {
    const newStep: TestCaseStep = {
      id: `step-${Date.now()}`,
      order: data.steps.length + 1,
      action: '',
      testData: '',
      expectedResult: '',
      attachments: [],
      isComplete: false,
    };
    onChange({ steps: [...data.steps, newStep] });
  }, [data.steps, onChange]);

  const handleUpdateStep = useCallback((updatedStep: TestCaseStep) => {
    onChange({
      steps: data.steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)),
    });
  }, [data.steps, onChange]);

  const handleDeleteStep = useCallback((id: string) => {
    const newSteps = data.steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onChange({ steps: newSteps });
    toast.success('Step deleted');
  }, [data.steps, onChange]);

  const handleDuplicateStep = useCallback((step: TestCaseStep) => {
    const index = data.steps.findIndex((s) => s.id === step.id);
    const newStep: TestCaseStep = {
      ...step,
      id: `step-${Date.now()}`,
      order: index + 2,
    };
    const newSteps = [
      ...data.steps.slice(0, index + 1),
      newStep,
      ...data.steps.slice(index + 1).map((s) => ({ ...s, order: s.order + 1 })),
    ];
    onChange({ steps: newSteps });
    toast.success('Step duplicated');
  }, [data.steps, onChange]);

  const handleMoveStep = useCallback((index: number, direction: 'up' | 'down') => {
    const newSteps = [...data.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    onChange({ steps: newSteps.map((s, i) => ({ ...s, order: i + 1 })) });
  }, [data.steps, onChange]);

  const handleReorder = useCallback((newOrder: TestCaseStep[]) => {
    onChange({ steps: newOrder.map((s, i) => ({ ...s, order: i + 1 })) });
  }, [onChange]);

  const handleCopySteps = useCallback(() => {
    const stepsText = data.steps
      .map((s, i) => `Step ${i + 1}:\nAction: ${s.action}\nExpected: ${s.expectedResult}`)
      .join('\n\n');
    navigator.clipboard.writeText(stepsText);
    toast.success('Steps copied to clipboard');
  }, [data.steps]);

  const handleModeChange = (mode: StepMode) => {
    setStepMode(mode);
    onChange({ stepMode: mode });
  };

  return (
    <div className="space-y-4 py-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              stepMode === 'classic'
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleModeChange('classic')}
          >
            <Check className="w-3.5 h-3.5 inline mr-1.5" />
            Classic
          </button>
          <button
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              stepMode === 'bdd'
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleModeChange('bdd')}
          >
            BDD/Gherkin
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onOpenTemplates}>
          <FileText className="w-4 h-4 mr-1.5" />
          Templates
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopySteps} disabled={data.steps.length === 0}>
          <ClipboardCopy className="w-4 h-4 mr-1.5" />
          Copy
        </Button>
        <Button 
          size="sm" 
          onClick={onOpenAIGenerate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          AI Generate
        </Button>
        <div className="flex-1" />
        {stepMode === 'classic' && (
          <Button onClick={handleAddStep}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Step
          </Button>
        )}
      </div>

      {/* Content */}
      {stepMode === 'classic' ? (
        <div className="space-y-3">
          {data.steps.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No test steps defined</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add steps to define the test procedure
              </p>
              <Button onClick={handleAddStep}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Step
              </Button>
            </div>
          ) : (
            <Reorder.Group axis="y" values={data.steps} onReorder={handleReorder} className="space-y-3">
              <AnimatePresence initial={false}>
                {data.steps.map((step, index) => (
                  <Reorder.Item key={step.id} value={step}>
                    <StepCard
                      step={step}
                      index={index}
                      onUpdate={handleUpdateStep}
                      onDelete={() => handleDeleteStep(step.id)}
                      onDuplicate={() => handleDuplicateStep(step)}
                      onMoveUp={() => handleMoveStep(index, 'up')}
                      onMoveDown={() => handleMoveStep(index, 'down')}
                      isFirst={index === 0}
                      isLast={index === data.steps.length - 1}
                    />
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      ) : (
        <BDDEditor
          content={data.gherkinContent || ''}
          onChange={(content) => onChange({ gherkinContent: content })}
        />
      )}
    </div>
  );
}
