// ============================================================================
// HOOK: useLabelTaskCounts — Get task counts per label
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LabelTaskCount {
  label_id: string;
  count: number;
}

export function useLabelTaskCounts() {
  return useQuery({
    queryKey: ['label-task-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_task_labels')
        .select('label_id');

      if (error) {
        console.error('Error fetching label task counts:', error);
        return {};
      }

      // Count occurrences per label_id
      const counts: Record<string, number> = {};
      for (const item of data || []) {
        const labelId = item.label_id;
        counts[labelId] = (counts[labelId] || 0) + 1;
      }

      return counts;
    },
    staleTime: 30000,
  });
}

export default useLabelTaskCounts;
