// ============================================================
// RESCHEDULE TASK HOOK
// Drag-drop mutation to update task due_date
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RescheduleInput {
  taskId: string;
  newDate: Date;
}

export function useRescheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newDate }: RescheduleInput) => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .update({ due_date: format(newDate, 'yyyy-MM-dd') })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (data, { newDate }) => {
      const formattedDate = format(newDate, 'MMM d');
      toast.success(`Task moved to ${formattedDate}`);
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },

    onError: () => {
      toast.error('Failed to reschedule task');
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
  });
}
