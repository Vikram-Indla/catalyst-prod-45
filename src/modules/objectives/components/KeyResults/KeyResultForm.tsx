import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const metricTypes = [
  { value: 'count', label: 'Count' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'decimal_score', label: 'Decimal Score' },
  { value: 'nps', label: 'NPS' },
] as const;

const keyResultSchema = z.object({
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary too long'),
  metric_type: z.enum(['count', 'currency', 'percentage', 'decimal_score', 'nps']),
  baseline_value: z.number().optional(),
  goal_value: z.number().min(0, 'Goal value must be positive'),
});

type KeyResultFormData = z.infer<typeof keyResultSchema>;

interface KeyResultFormProps {
  initialData?: Partial<KeyResultFormData>;
  onSubmit: (data: KeyResultFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function KeyResultForm({ initialData, onSubmit, onCancel, isLoading }: KeyResultFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<KeyResultFormData>({
    resolver: zodResolver(keyResultSchema),
    defaultValues: {
      summary: initialData?.summary || '',
      metric_type: initialData?.metric_type || 'count',
      baseline_value: initialData?.baseline_value || 0,
      goal_value: initialData?.goal_value || 100,
    },
  });

  const metricType = watch('metric_type');

  const getPlaceholder = (type: string) => {
    switch (type) {
      case 'count': return 'e.g., 150';
      case 'currency': return 'e.g., 50000';
      case 'percentage': return 'e.g., 85';
      case 'decimal_score': return 'e.g., 0.75';
      case 'nps': return 'e.g., 42';
      default: return '';
    }
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="summary">Key Result Summary*</Label>
            <Input
              id="summary"
              {...register('summary')}
              placeholder="Increase customer satisfaction score"
              className="mt-1"
            />
            {errors.summary && (
              <p className="text-sm text-destructive mt-1">{errors.summary.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="metric_type">Metric Type*</Label>
            <Select
              value={metricType}
              onValueChange={(value) => setValue('metric_type', value as any)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metricTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.metric_type && (
              <p className="text-sm text-destructive mt-1">{errors.metric_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="baseline_value">Baseline Value</Label>
              <Input
                id="baseline_value"
                type="number"
                step="any"
                {...register('baseline_value', { valueAsNumber: true })}
                placeholder={getPlaceholder(metricType)}
                className="mt-1"
              />
              {errors.baseline_value && (
                <p className="text-sm text-destructive mt-1">{errors.baseline_value.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="goal_value">Goal Value*</Label>
              <Input
                id="goal_value"
                type="number"
                step="any"
                {...register('goal_value', { valueAsNumber: true })}
                placeholder={getPlaceholder(metricType)}
                className="mt-1"
              />
              {errors.goal_value && (
                <p className="text-sm text-destructive mt-1">{errors.goal_value.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
