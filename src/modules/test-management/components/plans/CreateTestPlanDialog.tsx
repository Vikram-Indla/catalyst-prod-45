/**
 * CreateTestPlanDialog - Form dialog for creating a new test plan
 * Catalyst V5 design tokens
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateTestPlan } from '../../hooks/useTestPlans';
import { useReleases } from '@/hooks/useWorkItemVersions';
import type { TestPlanStatus, CreateTestPlanInput } from '../../types/testPlans';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'executing', 'completed', 'archived'] as const).default('draft'),
  release_id: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  objectives: z.string().optional(),
  scope_in: z.string().optional(),
  scope_out: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTestPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (planId: string) => void;
}

export function CreateTestPlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTestPlanDialogProps) {
  const { data: releases = [], isLoading: releasesLoading } = useReleases();
  const createMutation = useCreateTestPlan();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'draft',
      release_id: undefined,
      objectives: '',
      scope_in: '',
      scope_out: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    const input: CreateTestPlanInput = {
      name: data.name,
      description: data.description,
      status: data.status as TestPlanStatus,
      release_id: data.release_id || undefined,
      start_date: data.start_date?.toISOString().split('T')[0],
      end_date: data.end_date?.toISOString().split('T')[0],
      objectives: data.objectives,
      scope_in: data.scope_in,
      scope_out: data.scope_out,
    };

    try {
      const result = await createMutation.mutateAsync(input);
      form.reset();
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="w-5 h-5 text-primary" />
            Create Test Plan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Release 2.0 Regression Test Plan"
              {...form.register('name')}
              className={form.formState.errors.name ? 'border-destructive' : ''}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the scope and goals of this test plan..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          {/* Status & Release Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as TestPlanStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="executing">Executing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Release</Label>
              <Select
                value={form.watch('release_id') || ''}
                onValueChange={(value) => form.setValue('release_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={releasesLoading ? 'Loading...' : 'Select release'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Release</SelectItem>
                  {releases.map((rel) => (
                    <SelectItem key={rel.id} value={rel.id}>
                      {rel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('start_date') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('start_date')
                      ? format(form.watch('start_date')!, 'PPP')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('start_date')}
                    onSelect={(date) => form.setValue('start_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('end_date') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('end_date')
                      ? format(form.watch('end_date')!, 'PPP')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('end_date')}
                    onSelect={(date) => form.setValue('end_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <Label htmlFor="objectives" className="text-sm font-medium">
              Objectives
            </Label>
            <Textarea
              id="objectives"
              placeholder="Key objectives for this test plan..."
              rows={2}
              {...form.register('objectives')}
            />
          </div>

          {/* Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scope_in" className="text-sm font-medium">
                In Scope
              </Label>
              <Textarea
                id="scope_in"
                placeholder="Features/areas included in testing..."
                rows={2}
                {...form.register('scope_in')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope_out" className="text-sm font-medium">
                Out of Scope
              </Label>
              <Textarea
                id="scope_out"
                placeholder="Features/areas excluded from testing..."
                rows={2}
                {...form.register('scope_out')}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Test Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTestPlanDialog;
