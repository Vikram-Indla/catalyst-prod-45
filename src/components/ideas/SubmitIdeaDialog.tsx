import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Lightbulb, Sparkles } from 'lucide-react';
import { useCreateImprovementIdea, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { IDEA_CATEGORY_LABELS, ImprovementIdeaCategory } from '@/types/improvement-ideas';
import { toast } from 'sonner';

const ideaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  title_ar: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  description_ar: z.string().optional(),
  category: z.enum([
    'licensing_improvement',
    'compliance_automation',
    'investor_experience',
    'process_optimization',
    'digital_service',
    'integration',
    'data_quality',
    'accessibility',
    'security_enhancement',
    'reporting_analytics',
    'mobile_capability',
    'other',
  ] as const),
  initiative_id: z.string().optional(),
  is_anonymous: z.boolean().default(false),
});

type IdeaFormValues = z.infer<typeof ideaSchema>;

interface SubmitIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInitiative?: string;
}

export function SubmitIdeaDialog({
  open,
  onOpenChange,
  preselectedInitiative,
}: SubmitIdeaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: initiatives = [] } = useImprovementInitiatives();
  const createIdea = useCreateImprovementIdea();

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: {
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      category: 'process_optimization',
      initiative_id: preselectedInitiative,
      is_anonymous: false,
    },
  });

  const onSubmit = async (data: IdeaFormValues) => {
    setIsSubmitting(true);
    try {
      await createIdea.mutateAsync({
        title: data.title,
        title_ar: data.title_ar || undefined,
        description: data.description,
        description_ar: data.description_ar || undefined,
        category: data.category,
        initiative_id: data.initiative_id || undefined,
        is_anonymous: data.is_anonymous,
        submitter_type: 'employee',
      });
      toast.success('Idea submitted successfully!', {
        description: 'Your idea will be reviewed by the team.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit idea', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Submit Your Idea
          </DialogTitle>
          <DialogDescription>
            Share your improvement idea. Great ideas can transform how we work!
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Initiative Selection */}
            <FormField
              control={form.control}
              name="initiative_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initiative (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an initiative or leave empty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No specific initiative</SelectItem>
                      {initiatives.map((init) => (
                        <SelectItem key={init.id} value={init.id}>
                          {init.code} - {init.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link your idea to an active initiative for better visibility.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (English) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="A clear, concise title for your idea"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Arabic)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="عنوان الفكرة بالعربية"
                      dir="rtl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(IDEA_CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <FormLabel>Description (English) *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your idea in detail. What problem does it solve? How would it work?"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Arabic)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="وصف الفكرة بالتفصيل بالعربية"
                      rows={3}
                      dir="rtl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Anonymous Toggle */}
            <FormField
              control={form.control}
              name="is_anonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Submit Anonymously</FormLabel>
                    <FormDescription>
                      Your name will not be visible to other users.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* AI Enhancement Notice */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI-Enhanced Processing</p>
                <p className="text-sm text-muted-foreground">
                  Your idea will be automatically analyzed for category suggestions, 
                  compliance alignment, and potential duplicates.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Idea
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default SubmitIdeaDialog;
