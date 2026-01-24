/**
 * Edit Test Cycle Dialog
 * Dialog for editing test cycle details with lifecycle-aware status transitions
 */

import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  type CycleStatus,
  CYCLE_STATUS_CONFIG,
  ALL_CYCLE_STATUSES,
  getAllowedNextStatuses,
  isValidStatusTransition,
  getStatusEditability,
  getTransitionErrorMessage,
} from '@/features/test-cycles/types/cycle-config';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  environment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'UAT', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

interface TestCycleData {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  environment?: string | null;
}

interface EditTestCycleDialogProps {
  open: boolean;
  cycle: TestCycleData | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTestCycleDialog({
  open,
  cycle,
  onOpenChange,
  onSuccess,
}: EditTestCycleDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'draft',
      planned_start_date: '',
      planned_end_date: '',
      environment: '',
    },
  });

  // Current status for determining available transitions
  const currentStatus = (cycle?.status || 'draft') as CycleStatus;
  
  // Get editability rules based on status
  const editability = useMemo(() => getStatusEditability(currentStatus), [currentStatus]);
  
  // Get allowed status transitions (including current status)
  const availableStatuses = useMemo(() => {
    const allowed = getAllowedNextStatuses(currentStatus);
    // Always include current status as an option
    if (!allowed.includes(currentStatus)) {
      return [currentStatus, ...allowed];
    }
    return [currentStatus, ...allowed.filter(s => s !== currentStatus)];
  }, [currentStatus]);

  // Watch the selected status to show transition warnings
  const watchedStatus = form.watch('status') as CycleStatus;
  const isStatusChanging = watchedStatus !== currentStatus;
  const isValidTransition = isStatusChanging ? isValidStatusTransition(currentStatus, watchedStatus) : true;

  // Reset form when cycle changes
  useEffect(() => {
    if (cycle) {
      form.reset({
        name: cycle.name,
        description: cycle.description || '',
        status: cycle.status,
        planned_start_date: cycle.startDate?.split('T')[0] || '',
        planned_end_date: cycle.endDate?.split('T')[0] || '',
        environment: cycle.environment || '',
      });
    }
  }, [cycle, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!cycle) throw new Error('No cycle selected');

      // Validate status transition if status is changing
      const newStatus = data.status as CycleStatus;
      if (newStatus !== currentStatus) {
        if (!isValidStatusTransition(currentStatus, newStatus)) {
          throw new Error(getTransitionErrorMessage(currentStatus, newStatus));
        }
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only include editable fields based on current status
      if (editability.editableFields.includes('name') || !editability.lockedFields.includes('name')) {
        updatePayload.name = data.name;
      }
      if (editability.editableFields.includes('description') || !editability.lockedFields.includes('description')) {
        updatePayload.description = data.description || null;
      }
      if (editability.editableFields.includes('environment') || !editability.lockedFields.includes('environment')) {
        updatePayload.environment = data.environment || null;
      }
      if (editability.editableFields.includes('planned_start') || !editability.lockedFields.includes('planned_start')) {
        updatePayload.planned_start = data.planned_start_date || null;
      }
      if (editability.editableFields.includes('planned_end') || !editability.lockedFields.includes('planned_end')) {
        updatePayload.planned_end = data.planned_end_date || null;
      }

      // Handle status change
      if (newStatus !== currentStatus) {
        updatePayload.status = newStatus;
        
        // Auto-set timestamps on certain transitions
        if (newStatus === 'active' && (currentStatus === 'planned' || currentStatus === 'draft')) {
          updatePayload.actual_start = new Date().toISOString();
        }
        if (newStatus === 'completed') {
          updatePayload.actual_end = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('tm_test_cycles')
        .update(updatePayload)
        .eq('id', cycle.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycles-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      toast.success('Test cycle updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update cycle: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  // Check if form is read-only
  const isReadOnly = !editability.isEditable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Test Cycle</DialogTitle>
          <DialogDescription>
            {isReadOnly 
              ? 'This cycle is read-only. Archived and completed cycles cannot be modified.'
              : 'Update the test cycle details below.'}
          </DialogDescription>
        </DialogHeader>

        {/* Editability warning */}
        {editability.reason && !isReadOnly && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{editability.reason}</AlertDescription>
          </Alert>
        )}

        {/* Invalid transition warning */}
        {isStatusChanging && !isValidTransition && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getTransitionErrorMessage(currentStatus, watchedStatus)}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Sprint 24 Regression" 
                      disabled={isReadOnly || editability.lockedFields.includes('name')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the purpose of this test cycle..."
                      rows={3}
                      disabled={isReadOnly || editability.lockedFields.includes('description')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {availableStatuses.map((status) => {
                          const config = CYCLE_STATUS_CONFIG[status];
                          return (
                            <SelectItem key={status} value={status}>
                              <span className="flex items-center gap-2">
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: config.color }}
                                />
                                {config.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {isStatusChanging && isValidTransition && (
                      <FormDescription className="text-amber-600">
                        Status will change from {CYCLE_STATUS_CONFIG[currentStatus].label} to {CYCLE_STATUS_CONFIG[watchedStatus].label}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isReadOnly || editability.lockedFields.includes('environment')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {ENVIRONMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        disabled={isReadOnly || editability.lockedFields.includes('planned_start')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        disabled={isReadOnly || editability.lockedFields.includes('planned_end')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {!isReadOnly && (
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || (isStatusChanging && !isValidTransition)}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
