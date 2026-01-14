import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RescheduleParams, BulkRescheduleParams } from '@/types/calendar.types';

export function useTestReschedule(cycleId: string) {
  const queryClient = useQueryClient();

  const reschedule = useMutation({
    mutationFn: async ({ testId, newDate }: RescheduleParams) => {
      // Mock API call - in real implementation:
      // const { error } = await supabase
      //   .from('cycle_test_cases')
      //   .update({ due_date: newDate.toISOString() })
      //   .eq('id', testId);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      return { testId, newDate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-data', cycleId] });
      toast.success('Test rescheduled successfully');
    },
    onError: () => {
      toast.error('Failed to reschedule test');
    },
  });

  const bulkReschedule = useMutation({
    mutationFn: async (params: BulkRescheduleParams) => {
      // Mock API call for bulk operations
      await new Promise(resolve => setTimeout(resolve, 500));
      return params;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-data', cycleId] });
      toast.success(`${params.testIds.length} tests rescheduled`);
    },
    onError: () => {
      toast.error('Failed to reschedule tests');
    },
  });

  return { reschedule, bulkReschedule };
}
