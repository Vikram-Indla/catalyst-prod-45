/**
 * Steps Tab - Structured Test Steps Grid
 */

import React, { useCallback } from 'react';
import { 
  Plus, 
  GripVertical, 
  Copy, 
  Trash2, 
  Camera, 
  FileText, 
  Video, 
  AlertCircle,
  Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TabProps, TestStep } from './types';

const EVIDENCE_OPTIONS = [
  { value: 'none', label: 'None', icon: null },
  { value: 'screenshot', label: 'Screenshot', icon: Camera },
  { value: 'log', label: 'Log', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
];

interface StepsTabProps extends TabProps {
  addStep: () => void;
  removeStep: (id: string) => void;
  duplicateStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
}

export function StepsTab({ 
  formData, 
  setFormData, 
  validation,
  addStep,
  removeStep,
  duplicateStep,
}: StepsTabProps) {
  const updateStep = useCallback((stepId: string, field: keyof TestStep, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(s => 
        s.id === stepId ? { ...s, [field]: value } : s
      ),
    }));
  }, [setFormData]);

  const stepErrors = validation.errors.filter(e => e.tab === 'steps');

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={addStep} className="h-7 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" disabled>
            <Library className="h-3.5 w-3.5" />
            Insert Shared Step
          </Button>
        </div>
        <div className="text-xs text-text-tertiary">
          {formData.steps.length} step{formData.steps.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-[40px_40px_1fr_180px_1fr_120px_80px] gap-2 px-4 py-2 border-b border-border-default bg-surface-2 text-xs font-medium text-text-secondary">
        <div></div>
        <div>#</div>
        <div>Action / Step <span className="text-status-error">*</span></div>
        <div>Test Data / Input</div>
        <div>Expected Result <span className="text-status-error">*</span></div>
        <div>Evidence</div>
        <div></div>
      </div>

      {/* Steps List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border-default">
          {formData.steps.map((step, index) => {
            const hasActionNoExpected = step.action.trim() && !step.expectedResult.trim();
            
            return (
              <div 
                key={step.id}
                className={cn(
                  'grid grid-cols-[40px_40px_1fr_180px_1fr_120px_80px] gap-2 px-4 py-2 group hover:bg-surface-hover',
                  hasActionNoExpected && 'bg-status-warning/5'
                )}
              >
                {/* Drag Handle */}
                <div className="flex items-start justify-center pt-2">
                  <GripVertical className="h-4 w-4 text-text-quaternary cursor-grab opacity-0 group-hover:opacity-100" />
                </div>

                {/* Step Number */}
                <div className="flex items-start pt-2">
                  <Badge variant="outline" className="text-xs h-5 min-w-[24px] justify-center">
                    {step.stepOrder}
                  </Badge>
                </div>

                {/* Action */}
                <div>
                  <Textarea
                    placeholder="Describe the action to perform..."
                    value={step.action}
                    onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                    className="text-sm bg-surface-2 min-h-[60px] resize-none"
                  />
                </div>

                {/* Test Data */}
                <div>
                  <Textarea
                    placeholder="Input data..."
                    value={step.testData}
                    onChange={(e) => updateStep(step.id, 'testData', e.target.value)}
                    className="text-sm bg-surface-2 min-h-[60px] resize-none"
                  />
                </div>

                {/* Expected Result */}
                <div className="relative">
                  <Textarea
                    placeholder="Expected outcome..."
                    value={step.expectedResult}
                    onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                    className={cn(
                      'text-sm bg-surface-2 min-h-[60px] resize-none',
                      hasActionNoExpected && 'border-status-warning'
                    )}
                  />
                  {hasActionNoExpected && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="absolute top-2 right-2 h-4 w-4 text-status-warning" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Expected result required for Ready status
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Evidence Required */}
                <div>
                  <Select
                    value={step.evidenceRequired}
                    onValueChange={(v) => updateStep(step.id, 'evidenceRequired', v)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-surface-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1">
                      {EVIDENCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-1 pt-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => duplicateStep(step.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-status-error"
                          onClick={() => removeStep(step.id)}
                          disabled={formData.steps.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {formData.steps.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-text-tertiary text-sm mb-4">No steps defined yet</p>
            <Button size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Step
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Validation Warnings */}
      {stepErrors.length > 0 && (
        <div className="px-4 py-2 border-t border-border-default bg-status-warning/10">
          <div className="flex items-center gap-2 text-xs text-status-warning">
            <AlertCircle className="h-4 w-4" />
            <span>
              {stepErrors.length} validation warning{stepErrors.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
