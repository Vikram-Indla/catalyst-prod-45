import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const formSchema = z.object({
  from_feature_id: z.string().min(1, 'Source feature is required'),
  to_feature_id: z.string().min(1, 'Target feature is required'),
  type: z.enum(['sequential', 'concurrent', 'program', 'external']),
  risk_level: z.enum(['low', 'med', 'high']),
  status: z.enum(['open', 'in_progress', 'done', 'pending_commit', 'negotiation', 'committed', 'delivered', 'no_work_done', 'rejected']),
  due_iteration_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DependencyDialogProps {
  open: boolean;
  onClose: () => void;
  dependencyId?: string;
}

export function DependencyDialog({ open, onClose, dependencyId }: DependencyDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!dependencyId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_feature_id: '',
      to_feature_id: '',
      type: 'sequential',
      risk_level: 'low',
      status: 'open',
      due_iteration_id: '',
    },
  });

  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*, projects(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .order('start_date');
      if (error) throw error;
      return data;
    },
  });

  const { data: existingDependency } = useQuery({
    queryKey: ['dependency', dependencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependencies')
        .select('*')
        .eq('id', dependencyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingDependency) {
      form.reset({
        from_feature_id: existingDependency.from_feature_id,
        to_feature_id: existingDependency.to_feature_id,
        type: existingDependency.type || 'sequential',
        risk_level: existingDependency.risk_level || 'low',
        status: existingDependency.status || 'open',
        due_iteration_id: existingDependency.due_iteration_id || '',
      });
    }
  }, [existingDependency, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        from_feature_id: data.from_feature_id,
        to_feature_id: data.to_feature_id,
        type: data.type,
        risk_level: data.risk_level,
        status: data.status,
        due_iteration_id: data.due_iteration_id || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('dependencies')
          .update(payload)
          .eq('id', dependencyId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dependencies').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-dependencies'] });
      toast.success(isEdit ? 'Dependency updated' : 'Dependency created');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} dependency: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Dependency</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="from_feature_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Feature</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source feature" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {features?.map((feature) => (
                        <SelectItem key={feature.id} value={feature.id}>
                          {feature.name} ({feature.projects?.name})
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
              name="to_feature_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Feature</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target feature" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {features?.map((feature) => (
                        <SelectItem key={feature.id} value={feature.id}>
                          {feature.name} ({feature.projects?.name})
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="concurrent">Concurrent</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="risk_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="med">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
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
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending_commit">Pending Commit</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="committed">Committed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="no_work_done">No Work Done</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_iteration_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Iteration (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select iteration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iterations?.map((iteration) => (
                        <SelectItem key={iteration.id} value={iteration.id}>
                          {iteration.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
