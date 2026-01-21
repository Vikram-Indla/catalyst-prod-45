/**
 * Module 4C-1: Create Run Template Dialog
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileText } from 'lucide-react';
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
import { useCreateTemplate } from '../../hooks/useRunTemplates';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(1000).optional(),
  environment: z.enum(['development', 'staging', 'production', 'custom']),
  filter_priority: z.string().optional(),
  filter_type: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateTemplateDialogProps) {
  const createTemplate = useCreateTemplate();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      environment: 'staging',
      filter_priority: '',
      filter_type: '',
    },
  });

  const handleSubmit = async (data: TemplateFormData) => {
    const testCaseFilter: Record<string, string> = {};
    if (data.filter_priority) testCaseFilter.priority = data.filter_priority;
    if (data.filter_type) testCaseFilter.type = data.filter_type;

    try {
      await createTemplate.mutateAsync({
        project_id: projectId,
        name: data.name,
        description: data.description,
        environment: data.environment,
        test_case_filter: testCaseFilter,
      });
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Run Template
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Regression Suite" {...field} />
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
                      placeholder="Optional description..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Environment</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Auto-Select Filters (Optional)</FormLabel>
              <FormDescription>
                Automatically include test cases matching these criteria
              </FormDescription>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="filter_priority"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Any priority</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="filter_type"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Any type</SelectItem>
                          <SelectItem value="functional">Functional</SelectItem>
                          <SelectItem value="regression">Regression</SelectItem>
                          <SelectItem value="smoke">Smoke</SelectItem>
                          <SelectItem value="integration">Integration</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createTemplate.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
