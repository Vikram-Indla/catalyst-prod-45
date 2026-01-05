/**
 * Steps Section Component
 * Expandable/collapsible test steps with drag-and-drop
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ArrowRight,
  Paperclip,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StepInput {
  id: string;
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
  attachments?: { name: string; type: string }[];
}

interface StepsSectionProps {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
  className?: string;
}

function generateId() {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function StepsSection({ 
  steps, 
  onChange, 
  expandedSteps, 
  onToggleStep,
  className 
}: StepsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddStep = () => {
    const newStep: StepInput = {
      id: generateId(),
      step_number: steps.length + 1,
      action: '',
      test_data: '',
      expected_result: '',
      attachments: [],
    };
    onChange([...steps, newStep]);
    onToggleStep(newStep.id); // Expand new step
  };

  const handleUpdateStep = (id: string, field: keyof StepInput, value: string) => {
    onChange(steps.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleDeleteStep = (id: string) => {
    const updated = steps.filter(s => s.id !== id);
    updated.forEach((s, i) => (s.step_number = i + 1));
    onChange(updated);
  };

  const handleDuplicateStep = (step: StepInput) => {
    const index = steps.findIndex(s => s.id === step.id);
    const newStep: StepInput = {
      ...step,
      id: generateId(),
      step_number: index + 2,
    };
    const updated = [...steps];
    updated.splice(index + 1, 0, newStep);
    updated.forEach((s, i) => (s.step_number = i + 1));
    onChange(updated);
  };

  return (
    <div
      className={cn(
        'bg-background rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-200',
        'hover:shadow-md',
        className
      )}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-muted/50 to-muted/80 border-b border-border cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Test Steps
          </h2>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-success/10 text-success">
            {steps.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddStep();
            }}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            + Add Step
          </button>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Section Body */}
      {isExpanded && (
        <div className="p-5">
          <div className="flex flex-col gap-3">
            {steps.map((step) => {
              const isStepExpanded = expandedSteps.has(step.id);
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    'bg-background border rounded-lg overflow-hidden transition-all duration-200',
                    isStepExpanded 
                      ? 'border-primary/30 shadow-md shadow-primary/5' 
                      : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
                  )}
                >
                  {/* Step Header (collapsed view) */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                      !isStepExpanded && 'hover:bg-muted/50'
                    )}
                    onClick={() => onToggleStep(step.id)}
                  >
                    {/* Drag handle */}
                    <div className="flex items-center justify-center w-5 h-5 text-muted-foreground/50 cursor-grab hover:text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Step number */}
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full text-[13px] font-bold shadow-sm shrink-0">
                      {step.step_number}
                    </div>

                    {/* Preview text */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate">
                        {step.action || 'Untitled step'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[200px]">{step.action ? step.action.slice(0, 40) + '...' : 'No action'}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="truncate max-w-[200px]">{step.expected_result ? step.expected_result.slice(0, 40) + '...' : 'No expected result'}</span>
                      </div>
                    </div>

                    {/* Data badge */}
                    {step.test_data && (
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-success/10 text-success shrink-0">
                        DATA
                      </Badge>
                    )}

                    {/* Chevron */}
                    <div className={cn(
                      'text-muted-foreground transition-transform duration-200',
                      isStepExpanded && 'rotate-180'
                    )}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Step Body (expanded view) */}
                  {isStepExpanded && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="h-px bg-border mb-4" />

                      {/* Action & Expected Result */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Action <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            value={step.action}
                            onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)}
                            placeholder="What should the tester do?"
                            className="min-h-[80px] text-sm resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Expected Result <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            value={step.expected_result}
                            onChange={(e) => handleUpdateStep(step.id, 'expected_result', e.target.value)}
                            placeholder="What should happen?"
                            className="min-h-[80px] text-sm resize-y"
                          />
                        </div>
                      </div>

                      {/* Test Data */}
                      <div className="mb-4">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Test Data
                        </label>
                        <Input
                          value={step.test_data}
                          onChange={(e) => handleUpdateStep(step.id, 'test_data', e.target.value)}
                          placeholder="username: test@example.com, password: Pass123!"
                          className="text-sm font-mono"
                        />
                      </div>

                      {/* Attachments */}
                      <div className="mb-4">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Attachments
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {step.attachments?.map((att, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md text-[11px] text-primary"
                            >
                              <Paperclip className="h-3 w-3" />
                              {att.name}
                              <button className="ml-1 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-background border border-dashed border-muted-foreground/30 rounded-md text-[11px] text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Step Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-[11px] text-muted-foreground">
                          Step {step.step_number} of {steps.length}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDuplicateStep(step)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStep(step.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Step Button */}
          <button
            type="button"
            onClick={handleAddStep}
            className={cn(
              'flex items-center justify-center gap-2 w-full mt-4 py-3.5',
              'bg-background border-2 border-dashed border-muted-foreground/20 rounded-lg',
              'text-[13px] font-medium text-muted-foreground',
              'cursor-pointer transition-all duration-150',
              'hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
            )}
          >
            <Plus className="h-4 w-4" />
            Add Test Step
          </button>
        </div>
      )}
    </div>
  );
}
