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
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  objective_id: z.string().min(1, 'Objective is required'),
  target_value: z.number().min(0, 'Target value must be positive'),
  current_value: z.number().min(0, 'Current value must be positive'),
});

type FormData = z.infer<typeof formSchema>;

interface KeyResultDialogProps {
  open: boolean;
  onClose: () => void;
  keyResultId?: string;
  objectiveId?: string;
}

export function KeyResultDialog({ open, onClose, keyResultId, objectiveId }: KeyResultDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!keyResultId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      objective_id: objectiveId || '',
      target_value: 0,
      current_value: 0,
    },
  });

  const { data: existingKeyResult } = useQuery({
    queryKey: ['key-result', keyResultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_results')
        .select('*')
        .eq('id', keyResultId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingKeyResult) {
      form.reset({
        name: existingKeyResult.name,
        objective_id: existingKeyResult.objective_id,
        target_value: existingKeyResult.target_value || 0,
        current_value: existingKeyResult.current_value || 0,
      });
    }
  }, [existingKeyResult, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        objective_id: data.objective_id,
        target_value: data.target_value,
        current_value: data.current_value,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('key_results')
          .update(payload)
          .eq('id', keyResultId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('key_results').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      toast.success(isEdit ? 'Key result updated' : 'Key result created');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} key result: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Key Result</DialogTitle>
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
                    <Input {...field} placeholder="e.g., Reach 1M users" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
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
