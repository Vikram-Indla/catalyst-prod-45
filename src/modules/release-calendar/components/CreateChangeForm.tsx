import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateChangeCard } from '../hooks/useChangeCards';
import type { CreateChangeCardInput } from '../types';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface CreateChangeFormProps {
  defaultDate?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateChangeForm({ defaultDate, onSuccess, onCancel }: CreateChangeFormProps) {
  const { user } = useAuth();
  const createChange = useCreateChangeCard();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateChangeCardInput>({
    defaultValues: {
      planned_prod_date: defaultDate || new Date().toISOString().split('T')[0],
      change_manager_user_id: user?.id || '',
    },
  });

  const onSubmit = async (data: CreateChangeCardInput) => {
    try {
      await createChange.mutateAsync({
        ...data,
        change_manager_user_id: user?.id || data.change_manager_user_id,
      });
      toast.success('Change created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create change');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="change_number" className="text-gray-700 dark:text-gray-300">Change Number *</Label>
        <Input
          id="change_number"
          {...register('change_number', { required: 'Change number is required' })}
          placeholder="CHG-001"
          className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        />
        {errors.change_number && (
          <p className="text-xs text-status-danger mt-1">{errors.change_number.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">Title *</Label>
        <Input
          id="title"
          {...register('title', { required: 'Title is required' })}
          placeholder="Change title"
          className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        />
        {errors.title && (
          <p className="text-xs text-status-danger mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe the change..."
          rows={3}
          className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="planned_prod_date" className="text-gray-700 dark:text-gray-300">Planned Production Date *</Label>
        <Input
          id="planned_prod_date"
          type="date"
          {...register('planned_prod_date', { required: 'Date is required' })}
          className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        />
        {errors.planned_prod_date && (
          <p className="text-xs text-status-danger mt-1">{errors.planned_prod_date.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} className="border-gray-200 dark:border-gray-700">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-brand-primary hover:bg-brand-primary/90 text-white">
          {isSubmitting ? 'Creating...' : 'Create Change'}
        </Button>
      </div>
    </form>
  );
}
