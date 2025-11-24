import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  release_vehicle_id: z.string().min(1, 'Release vehicle is required'),
  target_date: z.string().optional(),
  status: z.enum(['planned', 'ready', 'shipped']),
  readiness_pct: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ReleaseDialogProps {
  open: boolean;
  onClose: () => void;
  releaseId?: string;
}

export function ReleaseDialog({ open, onClose, releaseId }: ReleaseDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!releaseId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      release_vehicle_id: '',
      target_date: '',
      status: 'planned',
      readiness_pct: 0,
      notes: '',
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ['release-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_vehicles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: existingRelease } = useQuery({
    queryKey: ['release', releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('id', releaseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingRelease) {
      form.reset({
        name: existingRelease.name,
        release_vehicle_id: existingRelease.release_vehicle_id,
        target_date: existingRelease.target_date || '',
        status: existingRelease.status || 'planned',
        readiness_pct: existingRelease.readiness_pct || 0,
        notes: existingRelease.notes || '',
      });
    }
  }, [existingRelease, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        release_vehicle_id: data.release_vehicle_id,
        target_date: data.target_date || null,
        status: data.status,
        readiness_pct: data.readiness_pct || 0,
        notes: data.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('releases')
          .update(payload)
          .eq('id', releaseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('releases').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      toast.success(isEdit ? 'Release updated' : 'Release created');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} release: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Release</DialogTitle>
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
                    <Input {...field} placeholder="e.g., v2.0 Release" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="release_vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.type})
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
              name="target_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="readiness_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Readiness %</FormLabel>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
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
