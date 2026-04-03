/**
 * Test Reschedule Hook
 * Wired to tm_test_cycles for date updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RescheduleParams, BulkRescheduleParams } from '@/types/calendar.types';

export function useTestReschedule(cycleId: string) {
  const queryClient = useQueryClient();

  const reschedule = useMutation({
    mutationFn: async ({ testId, newDate }: RescheduleParams) => {
      // Update the cycle's planned dates
      const { error } = await (supabase as any)
        .from('tm_test_cycles')
        .update({ planned_end: newDate.toISOString() })
        .eq('id', cycleId);
      
      if (error) throw error;
      return { testId, newDate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-data', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle rescheduled successfully');
    },
    onError: () => {
      toast.error('Failed to reschedule');
    },
  });

  const bulkReschedule = useMutation({
    mutationFn: async (params: BulkRescheduleParams) => {
      // Bulk reschedule updates the cycle end date
      const { error } = await (supabase as any)
        .from('tm_test_cycles')
        .update({ planned_end: params.newDate.toISOString() })
        .eq('id', cycleId);
      
      if (error) throw error;
      return params;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-data', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`${params.testIds.length} items rescheduled`);
    },
    onError: () => {
      toast.error('Failed to reschedule');
    },
  });

  return { reschedule, bulkReschedule };
}