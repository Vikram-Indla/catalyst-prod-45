/**
 * Test Reschedule Hook
 * Wired to tm_test_cycles for date updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RescheduleParams, BulkRescheduleParams } from '@/types/calendar.types';

export function useTestReschedule(cycleId: string) {
  const queryClient = useQueryClient();

  const reschedule = useMutation({
    mutationFn: async ({ testId, newDate }: RescheduleParams) => {
      // Update the cycle's planned dates
      const { error } = await typedQuery('tm_test_cycles')
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
      // Bulk reschedule shifts the cycle end date
      if (params.shiftDays) {
        const { data: cycle } = await typedQuery('tm_test_cycles')
          .select('planned_end')
          .eq('id', cycleId)
          .single();
        
        if (cycle?.planned_end) {
          const newEnd = new Date(cycle.planned_end);
          newEnd.setDate(newEnd.getDate() + params.shiftDays);
          const { error } = await typedQuery('tm_test_cycles')
            .update({ planned_end: newEnd.toISOString() })
            .eq('id', cycleId);
          if (error) throw error;
        }
      }
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