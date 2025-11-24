import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  objective_level_id: z.string().min(1, 'Objective level is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  confidence: z.enum(['high', 'med', 'low']),
  progress_pct: z.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  objectiveId?: string;
  scopeType?: 'company' | 'portfolio' | 'program';
}

export function ObjectiveDialog({ open, onClose, objectiveId, scopeType }: ObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!objectiveId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      objective_level_id: '',
      start_date: '',
      end_date: '',
      confidence: 'med',
      progress_pct: 0,
    },
  });

  const { data: objectiveLevels } = useQuery({
    queryKey: ['objective-levels', scopeType],
    queryFn: async () => {
      let query = supabase.from('objective_levels').select('*');
      if (scopeType) {
        query = query.eq('scope_type', scopeType);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: existingObjective } = useQuery({
    queryKey: ['objective', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingObjective) {
      form.reset({
        name: existingObjective.name,
        objective_level_id: existingObjective.objective_level_id,
        start_date: existingObjective.start_date || '',
        end_date: existingObjective.end_date || '',
        confidence: existingObjective.confidence || 'med',
        progress_pct: existingObjective.progress_pct || 0,
      });
    }
  }, [existingObjective, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        objective_level_id: data.objective_level_id,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        confidence: data.confidence,
        progress_pct: data.progress_pct || 0,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('objectives')
          .update(payload)
          .eq('id', objectiveId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('objectives').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success(isEdit ? 'Objective updated' : 'Objective created');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} objective: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Objective</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Increase market share" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objective_level_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {objectiveLevels?.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="med">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
