/**
 * Create Test Cycle Modal
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar, PlayCircle, Folder } from 'lucide-react';
import { useTestSets } from '../../hooks/useTestSets';
import { CreateTestCycleInput } from '../../hooks/useTestCycles';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  objective: z.string().optional(),
  environment: z.string().optional(),
  build_version: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  source_set_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTestCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onSubmit: (input: CreateTestCycleInput) => Promise<void>;
  isSubmitting?: boolean;
}

const ENVIRONMENTS = ['Development', 'QA', 'Staging', 'UAT', 'Production'];

export function CreateTestCycleModal({
  open,
  onOpenChange,
  programId,
  onSubmit,
  isSubmitting,
}: CreateTestCycleModalProps) {
  const { testSets } = useTestSets(programId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      objective: '',
      environment: '',
      build_version: '',
      start_date: '',
      end_date: '',
      source_set_id: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      name: values.name,
      objective: values.objective,
      environment: values.environment,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      source_set_id: values.source_set_id || undefined,
      program_id: programId,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-accent-primary" />
            Create Test Cycle
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sprint 23 Regression" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_set_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Copy from Test Set</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a test set (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No source set</SelectItem>
                      {testSets.map(set => (
                        <SelectItem key={set.id} value={set.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-3.5 w-3.5" />
                            {set.name} ({set.case_count} cases)
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What this cycle validates..." className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENVIRONMENTS.map(env => (
                          <SelectItem key={env} value={env}>{env}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="build_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., v2.3.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Cycle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
