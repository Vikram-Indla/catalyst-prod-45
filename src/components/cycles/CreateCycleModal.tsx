/**
 * CATALYST TESTS - Enhanced Create Cycle Modal
 * 4-tab modal: Details, Cases, Planning, Settings
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createEnhancedCycle, createCycleFromTemplate, fetchCycleTemplates } from '@/services/cycleManagementService';
import { CycleDetailsTab } from './CycleDetailsTab';
import { CycleCasesTab } from './CycleCasesTab';
import { CyclePlanningTab } from './CyclePlanningTab';
import { CycleSettingsTab } from './CycleSettingsTab';
import type { EnhancedTestCycle } from '@/types/cycleManagement';

const cycleSchema = z.object({
  name: z.string().min(1, 'Cycle name is required').max(255),
  objective: z.string().optional(),
  folder_id: z.string().optional().nullable(),
  owner_id: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  build_version: z.string().optional(),
  environment: z.string().default('production'),
  template_id: z.string().optional().nullable(),
  auto_close_on_completion: z.boolean().default(false),
  email_notifications: z.boolean().default(true),
  scope_locked: z.boolean().default(false),
});

type CycleFormData = z.infer<typeof cycleSchema>;

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleToEdit?: EnhancedTestCycle;
  defaultFolderId?: string;
  fromSetId?: string;
}

export function CreateCycleModal({
  open,
  onOpenChange,
  cycleToEdit,
  defaultFolderId,
  fromSetId,
}: CreateCycleModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [selectedCases, setSelectedCases] = useState<{ case_id: string; version: number; assigned_to?: string }[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);

  const { data: templates } = useQuery({
    queryKey: ['cycle-templates'],
    queryFn: fetchCycleTemplates,
  });

  const form = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: cycleToEdit?.name || '',
      objective: cycleToEdit?.objective || '',
      folder_id: cycleToEdit?.folder_id || defaultFolderId || null,
      start_date: cycleToEdit?.start_date || new Date().toISOString().split('T')[0],
      end_date: cycleToEdit?.end_date || new Date().toISOString().split('T')[0],
      build_version: cycleToEdit?.build_version || '',
      environment: cycleToEdit?.environment || 'production',
      template_id: cycleToEdit?.template_id || null,
      auto_close_on_completion: cycleToEdit?.auto_close_on_completion ?? false,
      email_notifications: cycleToEdit?.email_notifications ?? true,
      scope_locked: cycleToEdit?.scope_locked ?? false,
    },
  });

  useEffect(() => {
    if (cycleToEdit) {
      form.reset({
        name: cycleToEdit.name,
        objective: cycleToEdit.objective || '',
        folder_id: cycleToEdit.folder_id,
        start_date: cycleToEdit.start_date,
        end_date: cycleToEdit.end_date,
        build_version: cycleToEdit.build_version || '',
        environment: cycleToEdit.environment,
        template_id: cycleToEdit.template_id,
        auto_close_on_completion: cycleToEdit.auto_close_on_completion,
        email_notifications: cycleToEdit.email_notifications,
        scope_locked: cycleToEdit.scope_locked,
      });
    }
  }, [cycleToEdit, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CycleFormData) => {
      if (data.template_id) {
        return createCycleFromTemplate(data.template_id, {
          name: data.name,
          objective: data.objective,
          folder_id: data.folder_id,
          start_date: data.start_date,
          end_date: data.end_date,
          build_version: data.build_version,
          environment: data.environment,
          auto_close_on_completion: data.auto_close_on_completion,
          email_notifications: data.email_notifications,
          scope_locked: data.scope_locked,
          cases: selectedCases,
          sets: fromSetId ? [fromSetId] : undefined,
        });
      }
      return createEnhancedCycle({
        name: data.name,
        objective: data.objective,
        folder_id: data.folder_id,
        start_date: data.start_date,
        end_date: data.end_date,
        build_version: data.build_version,
        environment: data.environment,
        auto_close_on_completion: data.auto_close_on_completion,
        email_notifications: data.email_notifications,
        scope_locked: data.scope_locked,
        cases: selectedCases,
        sets: fromSetId ? [fromSetId] : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(cycleToEdit ? 'Cycle updated successfully' : 'Cycle created successfully');
      onOpenChange(false);
      form.reset();
      setSelectedCases([]);
      setActiveTab('details');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      toast.error('End date must be after start date');
      return;
    }
    createMutation.mutate(data);
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      form.setValue('template_id', templateId);
      if (template.config.environment) {
        form.setValue('environment', template.config.environment);
      }
      if (template.config.auto_close_on_completion !== undefined) {
        form.setValue('auto_close_on_completion', template.config.auto_close_on_completion);
      }
      if (template.config.email_notifications !== undefined) {
        form.setValue('email_notifications', template.config.email_notifications);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            {cycleToEdit ? 'Edit Test Cycle' : 'Create New Test Cycle'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto py-4">
            <TabsContent value="details" className="mt-0 h-full">
              <CycleDetailsTab
                form={form}
                templates={templates || []}
                onTemplateSelect={handleTemplateSelect}
              />
            </TabsContent>

            <TabsContent value="cases" className="mt-0 h-full">
              <CycleCasesTab
                selectedCases={selectedCases}
                onCasesChange={setSelectedCases}
                fromSetId={fromSetId}
              />
            </TabsContent>

            <TabsContent value="planning" className="mt-0 h-full">
              <CyclePlanningTab
                cases={selectedCases}
                assignments={assignments}
                dependencies={dependencies}
                onAssignmentsChange={setAssignments}
                onDependenciesChange={setDependencies}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 h-full">
              <CycleSettingsTab form={form} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {selectedCases.length > 0 && (
              <span>{selectedCases.length} cases selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold/90 text-background"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cycleToEdit ? 'Save Changes' : 'Create Cycle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
