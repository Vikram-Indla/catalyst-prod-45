import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCheckIn } from '@/hooks/useKeyResults';
import { toast } from 'sonner';

const checkInSchema = z.object({
  value: z.number().min(0, 'Value must be positive'),
  note_richtext: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface KeyResultCheckInProps {
  keyResult: {
    id: string;
    summary: string;
    metric_type: string;
    baseline_value?: number;
    current_value?: number;
    goal_value: number;
  };
  open: boolean;
  onClose: () => void;
}

export function KeyResultCheckIn({ keyResult, open, onClose }: KeyResultCheckInProps) {
  const createCheckIn = useCreateCheckIn();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      value: keyResult.current_value || keyResult.baseline_value || 0,
      note_richtext: '',
    },
  });

  const onSubmit = async (data: CheckInFormData) => {
    try {
      await createCheckIn.mutateAsync({
        key_result_id: keyResult.id,
        value: data.value,
        note_richtext: data.note_richtext || null,
        checked_in_at: new Date().toISOString(),
      });
      toast.success('Check-in recorded successfully');
      reset();
      onClose();
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to record check-in');
    }
  };

  const getValueLabel = () => {
    switch (keyResult.metric_type) {
      case 'count': return 'Count';
      case 'currency': return 'Amount';
      case 'percentage': return 'Percentage';
      case 'decimal_score': return 'Score';
      case 'nps': return 'NPS Score';
      default: return 'Value';
    }
  };

  const getPlaceholder = () => {
    switch (keyResult.metric_type) {
      case 'count': return 'e.g., 150';
      case 'currency': return 'e.g., 50000';
      case 'percentage': return 'e.g., 85';
      case 'decimal_score': return 'e.g., 0.75';
      case 'nps': return 'e.g., 42';
      default: return '';
    }
  };

  const calculateProgress = (value: number) => {
    const baseline = keyResult.baseline_value || 0;
    const goal = keyResult.goal_value;
    if (goal === baseline) return 0;
    return Math.round(((value - baseline) / (goal - baseline)) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check-In: {keyResult.summary}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Baseline: {keyResult.baseline_value || 0}</span>
              <span>Goal: {keyResult.goal_value}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Current: {keyResult.current_value !== null && keyResult.current_value !== undefined
                ? keyResult.current_value
                : keyResult.baseline_value || 0}
            </div>
          </div>

          <div>
            <Label htmlFor="value">{getValueLabel()}*</Label>
            <Input
              id="value"
              type="number"
              step="any"
              {...register('value', { valueAsNumber: true })}
              placeholder={getPlaceholder()}
              className="mt-1"
            />
            {errors.value && (
              <p className="text-sm text-destructive mt-1">{errors.value.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="note_richtext">Note (optional)</Label>
            <Textarea
              id="note_richtext"
              {...register('note_richtext')}
              placeholder="Add context for this update..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={createCheckIn.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCheckIn.isPending}>
              {createCheckIn.isPending ? 'Saving...' : 'Record Check-In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
