/**
 * Create Execution Run Dialog
 * Wizard for creating new test execution runs
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Play } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TesterAssignment } from './TesterAssignment';
import { useRunMutations } from '../hooks/useRunMutations';
import type { ExecutionEnvironment, CreateRunInput } from '../types/test-execution';

const createRunSchema = z.object({
  name: z.string().min(1, 'Run name is required').max(200),
  description: z.string().max(1000).optional(),
  environment: z.enum(['development', 'staging', 'production', 'custom']),
  browser: z.string().optional(),
  browser_version: z.string().optional(),
});

type CreateRunFormData = z.infer<typeof createRunSchema>;

interface CreateRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: (runId: string) => void;
}

export const CreateRunDialog: React.FC<CreateRunDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}) => {
  const [assignedTesters, setAssignedTesters] = useState<string[]>([]);
  const { createRun, isCreating } = useRunMutations();

  const form = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      name: '',
      description: '',
      environment: 'staging',
      browser: 'chrome',
      browser_version: '',
    },
  });

  const handleSubmit = async (data: CreateRunFormData) => {
    const input: CreateRunInput = {
      project_id: projectId,
      name: data.name,
      description: data.description,
      environment: data.environment as ExecutionEnvironment,
      configuration: {
        browser: data.browser as any,
        browser_version: data.browser_version,
      },
      assigned_testers: assignedTesters,
    };

    try {
      const result = await createRun.mutateAsync(input);
      if (result?.run_id) {
        onSuccess?.(result.run_id);
        handleClose();
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    form.reset();
    setAssignedTesters([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Create Execution Run
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Run Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Run Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Sprint 24 Regression"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of this test run..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Environment */}
            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Environment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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

            {/* Browser Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="browser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Browser</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select browser" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chrome">Chrome</SelectItem>
                        <SelectItem value="firefox">Firefox</SelectItem>
                        <SelectItem value="safari">Safari</SelectItem>
                        <SelectItem value="edge">Edge</SelectItem>
                        <SelectItem value="mobile_ios">Mobile iOS</SelectItem>
                        <SelectItem value="mobile_android">Mobile Android</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="browser_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tester Assignment */}
            <div className="space-y-2">
              <Label>Assigned Testers</Label>
              <TesterAssignment
                selectedTesters={assignedTesters}
                onSelectionChange={setAssignedTesters}
                projectId={projectId}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Run
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
