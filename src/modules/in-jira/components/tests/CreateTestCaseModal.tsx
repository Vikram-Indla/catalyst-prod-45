/**
 * Create Test Case Modal
 * Modal with required Story picker for creating test cases
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Link2, FileText } from 'lucide-react';
import { useStoriesForLinking, CreateTestCaseInput, TestCasePriority, TestCaseType, TestCaseStatus } from '../../hooks/useTestCases';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  test_type: z.enum(['manual', 'automated', 'bdd']),
  status: z.enum(['draft', 'under_review', 'approved', 'published', 'deprecated']),
  linked_work_item_id: z.string().min(1, 'Story link is required'),
  component: z.string().optional(),
  objective: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  programId: string;
  onSubmit: (data: CreateTestCaseInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateTestCaseModal({
  open,
  onOpenChange,
  projectId,
  programId,
  onSubmit,
  isSubmitting = false,
}: CreateTestCaseModalProps) {
  const { data: stories, isLoading: storiesLoading } = useStoriesForLinking(projectId);
  const [storySearch, setStorySearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      preconditions: '',
      priority: 'medium',
      test_type: 'manual',
      status: 'draft',
      linked_work_item_id: '',
      component: '',
      objective: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.description,
      preconditions: values.preconditions,
      priority: values.priority as TestCasePriority,
      test_type: values.test_type as TestCaseType,
      status: values.status as TestCaseStatus,
      linked_work_item_type: 'story',
      linked_work_item_id: values.linked_work_item_id,
      program_id: programId,
      component: values.component,
      objective: values.objective,
    });
    form.reset();
    onOpenChange(false);
  };

  const filteredStories = stories?.filter(s =>
    s.title.toLowerCase().includes(storySearch.toLowerCase()) ||
    s.story_key?.toLowerCase().includes(storySearch.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-1 border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <FileText className="h-5 w-5 text-accent-primary" />
            Create Test Case
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-secondary">Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter test case title"
                      className="bg-surface-2 border-border-default text-text-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked Story - REQUIRED */}
            <FormField
              control={form.control}
              name="linked_work_item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-secondary flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Linked Story *
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                        <SelectValue placeholder="Select a story to test..." />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border-default max-h-60">
                        <div className="p-2 sticky top-0 bg-surface-1">
                          <Input
                            placeholder="Search stories..."
                            value={storySearch}
                            onChange={(e) => setStorySearch(e.target.value)}
                            className="h-8 text-sm bg-surface-2 border-border-default"
                          />
                        </div>
                        {storiesLoading ? (
                          <div className="p-4 text-center text-text-tertiary">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : filteredStories.length === 0 ? (
                          <div className="p-4 text-center text-text-tertiary text-sm">
                            No stories found in this project
                          </div>
                        ) : (
                          filteredStories.map((story) => (
                            <SelectItem key={story.id} value={story.id}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-xs text-accent-primary">
                                  {story.story_key}
                                </span>
                                <span className="truncate">{story.title}</span>
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row: Priority + Type + Status */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="test_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automated">Automated</SelectItem>
                        <SelectItem value="bdd">BDD/Gherkin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-2 border-border-default text-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface-1 border-border-default">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-secondary">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Test case description..."
                      rows={3}
                      className="bg-surface-2 border-border-default text-text-primary resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preconditions */}
            <FormField
              control={form.control}
              name="preconditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-secondary">Preconditions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Prerequisites for this test..."
                      rows={2}
                      className="bg-surface-2 border-border-default text-text-primary resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row: Component + Objective */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="component"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">Component</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Authentication"
                        className="bg-surface-2 border-border-default text-text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">Objective</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="What this test validates"
                        className="bg-surface-2 border-border-default text-text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Create Test Case
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTestCaseModal;
