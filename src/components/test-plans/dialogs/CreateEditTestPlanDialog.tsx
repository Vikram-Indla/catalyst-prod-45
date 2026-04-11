/**
 * CreateEditTestPlanDialog - Main Dialog Component
 * GOD-TIER 9.8 Implementation - 4-Tab Wizard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, Target, FileText, Users, 
  X, Sparkles, FileStack, Loader2, AlertCircle, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { CreateEditTestPlanDialogProps, TabId } from './CreateEditTestPlanDialog.types';
import { useCreateEditPlanForm } from './hooks/useCreateEditPlanForm';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { ScopeTab } from './tabs/ScopeTab';
import { StrategyTab } from './tabs/StrategyTab';
import { TeamTab } from './tabs/TeamTab';
import { useCreateTestPlan, useUpdateTestPlan, useTestPlan } from '@/hooks/test-management';

export function CreateEditTestPlanDialog({ 
  open, 
  onOpenChange, 
  projectId,
  editPlanId,
  onSuccess 
}: CreateEditTestPlanDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const isEditing = !!editPlanId;

  // Fetch existing plan if editing
  const { data: existingPlan } = useTestPlan(editPlanId || '');
  
  // Form state
  const {
    formState,
    errors,
    isDirty,
    setField,
    setFields,
    validate,
    validateField,
    isFieldValid,
    coverageStats,
    reset,
    getTabErrors,
  } = useCreateEditPlanForm({ existingPlan: isEditing ? (existingPlan as any) : null });

  // Mutations
  const createMutation = useCreateTestPlan(projectId);
  const updateMutation = useUpdateTestPlan();

  const tabErrors = getTabErrors();

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, formState]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    reset();
    setActiveTab('basic');
    onOpenChange(false);
  }, [isDirty, reset, onOpenChange]);

  const handleSaveDraft = async () => {
    try {
      const input = {
        name: formState.name || 'Untitled Plan',
        description: formState.description,
        status: 'draft' as const,
        start_date: formState.start_date?.toISOString(),
        end_date: formState.end_date?.toISOString(),
        release_id: formState.release_id || undefined,
        objectives: formState.objectives,
        owner_id: formState.owner_id || undefined,
        team_members: formState.team_members,
      };

      if (isEditing && editPlanId) {
        await updateMutation.mutateAsync({ id: editPlanId, ...input });
      } else {
        await createMutation.mutateAsync(input);
      }
      
      toast.success('Draft saved successfully');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Find first tab with errors and switch to it
      if (tabErrors.basic) setActiveTab('basic');
      else if (tabErrors.team) setActiveTab('team');
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      const input = {
        name: formState.name,
        description: formState.description,
        status: formState.status,
        start_date: formState.start_date?.toISOString(),
        end_date: formState.end_date?.toISOString(),
        release_id: formState.release_id || undefined,
        objectives: formState.objectives,
        in_scope: formState.in_scope_ids.join(','),
        out_of_scope: formState.out_of_scope,
        test_strategy: formState.test_strategy,
        environment_requirements: formState.environment_requirements,
        owner_id: formState.owner_id || undefined,
        team_members: formState.team_members,
      };

      if (isEditing && editPlanId) {
        await updateMutation.mutateAsync({ id: editPlanId, ...input });
        toast.success('Test plan updated successfully');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Test plan created successfully');
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update test plan' : 'Failed to create test plan');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorCount = Object.keys(errors).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[1120px] h-[800px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEditing ? 'Edit Test Plan' : 'Create Test Plan'}
              </h2>
              {isDirty && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Unsaved changes
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Sparkles className="w-4 h-4" />
              Create with AI
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <FileStack className="w-4 h-4" />
              From Template
            </Button>
            <span className="text-[10px] text-muted-foreground px-2">
              ⌘+Enter to save
            </span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-background px-6 h-12">
            <TabsTrigger 
              value="basic" 
              className={cn(
                "gap-2 data-[state=active]:shadow-none relative",
                tabErrors.basic && "text-destructive"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Basic Info</span>
              {tabErrors.basic && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="scope" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Scope</span>
              {formState.in_scope_ids.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
                  {formState.in_scope_ids.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Strategy</span>
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className={cn(
                "gap-2",
                tabErrors.team && "text-destructive"
              )}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
              {formState.team_members.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
                  {formState.team_members.length}
                </span>
              )}
              {tabErrors.team && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="basic" className="m-0 h-full">
              <BasicInfoTab 
                formState={formState}
                errors={errors}
                setField={setField}
                setFields={setFields}
                validateField={validateField}
                isFieldValid={isFieldValid}
                projectId={projectId}
              />
            </TabsContent>
            <TabsContent value="scope" className="m-0 h-full">
              <ScopeTab 
                formState={formState}
                setField={setField}
                coverageStats={coverageStats}
              />
            </TabsContent>
            <TabsContent value="strategy" className="m-0 h-full">
              <StrategyTab 
                formState={formState}
                setField={setField}
              />
            </TabsContent>
            <TabsContent value="team" className="m-0 h-full">
              <TeamTab 
                formState={formState}
                errors={errors}
                setField={setField}
                projectId={projectId}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            {errorCount > 0 ? (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errorCount} validation error{errorCount !== 1 ? 's' : ''}
              </span>
            ) : isDirty ? (
              <span className="text-muted-foreground">Ready to save</span>
            ) : null}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isPending}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isPending}
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/90"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
