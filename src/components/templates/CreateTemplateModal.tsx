/**
 * CreateTemplateModal Component
 * Multi-step wizard for creating templates
 * Catalyst V5 Design System
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Zap, UserCheck, Settings, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { TemplateTestSelector } from './TemplateTestSelector';
import { TemplateAssignmentRules } from './TemplateAssignmentRules';
import { TemplateMilestones } from './TemplateMilestones';
import { useCreateTemplate } from '@/hooks/templates';
import type { WizardState, WizardStep, TemplateType, TemplateConfig } from '@/types/template.types';
import { INITIAL_WIZARD_STATE, TEMPLATE_TYPES, DEFAULT_ASSIGNMENT_RULES } from '@/types/template.types';

interface CreateTemplateModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'tests', label: 'Test Selection' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'review', label: 'Review' },
];

export function CreateTemplateModal({ projectId, isOpen, onClose, onSuccess }: CreateTemplateModalProps) {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const createTemplate = useCreateTemplate();
  
  const currentIndex = STEPS.findIndex(s => s.key === state.currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEPS.length - 1;
  
  const goNext = () => {
    if (!isLast) setState(s => ({ ...s, currentStep: STEPS[currentIndex + 1].key }));
  };
  
  const goPrev = () => {
    if (!isFirst) setState(s => ({ ...s, currentStep: STEPS[currentIndex - 1].key }));
  };
  
  const handleCreate = async () => {
    const config: TemplateConfig = {
      testCriteria: state.testCriteria,
      assignmentRules: state.assignmentRules,
      defaultDurationDays: state.schedule.durationDays,
      includeWeekends: state.schedule.includeWeekends,
      milestones: state.schedule.milestones,
    };
    
    await createTemplate.mutateAsync({
      project_id: projectId,
      name: state.basicInfo.name,
      description: state.basicInfo.description,
      config,
    });
    
    setState(INITIAL_WIZARD_STATE);
    onSuccess();
    onClose();
  };
  
  const handleClose = () => {
    setState(INITIAL_WIZARD_STATE);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <DialogDescription>
            Step {currentIndex + 1} of {STEPS.length}: {STEPS[currentIndex].label}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((step, i) => (
            <div key={step.key} className={`flex-1 h-1 rounded-full ${i <= currentIndex ? 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' : 'bg-slate-200'}`} />
          ))}
        </div>
        
        <div className="py-4 min-h-[300px]">
          {/* Step 1: Basic Info */}
          {state.currentStep === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={state.basicInfo.name}
                  onChange={(e) => setState(s => ({ ...s, basicInfo: { ...s.basicInfo, name: e.target.value } }))}
                  placeholder="e.g., Weekly Regression Suite"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={state.basicInfo.description}
                  onChange={(e) => setState(s => ({ ...s, basicInfo: { ...s.basicInfo, description: e.target.value } }))}
                  placeholder="Describe the purpose of this template..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={state.basicInfo.type}
                  onValueChange={(v: TemplateType) => setState(s => ({ ...s, basicInfo: { ...s.basicInfo, type: v } }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.values(TEMPLATE_TYPES).map(t => (
                      <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Step 2: Tests */}
          {state.currentStep === 'tests' && (
            <TemplateTestSelector
              projectId={projectId}
              criteria={state.testCriteria}
              onChange={(criteria) => setState(s => ({ ...s, testCriteria: criteria }))}
            />
          )}
          
          {/* Step 3: Assignment */}
          {state.currentStep === 'assignment' && (
            <TemplateAssignmentRules
              rules={state.assignmentRules}
              onChange={(rules) => setState(s => ({ ...s, assignmentRules: rules }))}
            />
          )}
          
          {/* Step 4: Schedule */}
          {state.currentStep === 'schedule' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={state.schedule.durationDays}
                    onChange={(e) => setState(s => ({ ...s, schedule: { ...s.schedule, durationDays: parseInt(e.target.value) || 7 } }))}
                    min={1}
                    max={90}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={state.schedule.includeWeekends}
                    onCheckedChange={(c) => setState(s => ({ ...s, schedule: { ...s.schedule, includeWeekends: c } }))}
                  />
                  <Label>Include Weekends</Label>
                </div>
              </div>
              <TemplateMilestones
                duration={state.schedule.durationDays}
                milestones={state.schedule.milestones}
                onChange={(m) => setState(s => ({ ...s, schedule: { ...s.schedule, milestones: m } }))}
              />
            </div>
          )}
          
          {/* Step 5: Review */}
          {state.currentStep === 'review' && (
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{state.basicInfo.name}</h4>
                <p className="text-slate-600">{state.basicInfo.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-500">Type:</span> {TEMPLATE_TYPES[state.basicInfo.type].label}</div>
                <div><span className="text-slate-500">Duration:</span> {state.schedule.durationDays} days</div>
                <div><span className="text-slate-500">Assignment:</span> {state.assignmentRules.method}</div>
                <div><span className="text-slate-500">Milestones:</span> {state.schedule.milestones.length}</div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={goPrev} disabled={isFirst}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {isLast ? (
              <Button onClick={handleCreate} disabled={!state.basicInfo.name || createTemplate.isPending} className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))] text-white">
                {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Create Template
              </Button>
            ) : (
              <Button onClick={goNext} className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))] text-white">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
