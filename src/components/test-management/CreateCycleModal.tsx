import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useCreateTestCycle } from '@/hooks/useTestManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const cycleSchema = z.object({
  name: z.string().min(1, 'Cycle name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  sprint_id: z.string().optional(),
  program_increment_id: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
});

type CycleFormData = z.infer<typeof cycleSchema>;

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleToEdit?: any;
}

export function CreateCycleModal({ open, onOpenChange, cycleToEdit }: CreateCycleModalProps) {
  const createCycleMutation = useCreateTestCycle();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: cycleToEdit?.name || '',
      description: cycleToEdit?.description || '',
      sprint_id: cycleToEdit?.sprint_id || '',
      program_increment_id: cycleToEdit?.program_increment_id || '',
      start_date: cycleToEdit?.start_date || new Date().toISOString().split('T')[0],
      end_date: cycleToEdit?.end_date || new Date().toISOString().split('T')[0],
      status: cycleToEdit?.status || 'planned',
    },
  });

  // Fetch sprints
  const { data: sprints } = useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iterations')
        .select('id, name')
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch program increments
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (data: CycleFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await createCycleMutation.mutateAsync({
        name: data.name,
        description: data.description || null,
        sprint_id: data.sprint_id || null,
        program_increment_id: data.program_increment_id || null,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        created_by: user.id,
      });

      toast.success('Test cycle created successfully');
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to create cycle: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            {cycleToEdit ? 'Edit Test Cycle' : 'Create New Test Cycle'}
          </DialogTitle>
          <DialogDescription>
            Organize test cases into cycles for systematic execution and tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">
                Cycle Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Sprint 1 Regression Tests"
                className="mt-1.5"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the test cycle..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sprint_id" className="text-foreground">Sprint</Label>
                <Select
                  value={watch('sprint_id')}
                  onValueChange={(value) => setValue('sprint_id', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select sprint (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sprints?.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="program_increment_id" className="text-foreground">
                  Program Increment
                </Label>
                <Select
                  value={watch('program_increment_id')}
                  onValueChange={(value) => setValue('program_increment_id', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select PI (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {programIncrements?.map((pi) => (
                      <SelectItem key={pi.id} value={pi.id}>
                        {pi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  className="mt-1.5"
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="end_date" className="text-foreground">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  className="mt-1.5"
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-foreground">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value: any) => setValue('status', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gold hover:bg-brand-gold/90 text-background"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cycleToEdit ? 'Save Changes' : 'Create Cycle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
