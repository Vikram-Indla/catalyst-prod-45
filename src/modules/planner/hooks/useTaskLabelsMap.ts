// ============================================================================
// HOOK: useTaskLabelsMap — Efficiently fetch labels for multiple tasks
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/planner/task-modal/types/labels';

interface TaskLabelsMap {
  [taskId: string]: Label[];
}

export function useTaskLabelsMap(taskIds: string[]) {
  return useQuery({
    queryKey: ['task-labels-map', taskIds.sort()],
    queryFn: async () => {
      if (taskIds.length === 0) return {};

      const { data, error } = await supabase
        .from('planner_task_labels')
        .select(`
          task_id,
          planner_labels (
            id,
            name,
            color,
            description
          )
        `)
        .in('task_id', taskIds);

      if (error) {
        console.error('Error fetching task labels map:', error);
        return {};
      }

      // Group labels by task_id
      const labelsMap: TaskLabelsMap = {};
      
      for (const item of data || []) {
        const taskId = item.task_id;
        const label = item.planner_labels as unknown as Label;
        
        if (!labelsMap[taskId]) {
          labelsMap[taskId] = [];
        }
        
        if (label) {
          labelsMap[taskId].push(label);
        }
      }

      return labelsMap;
    },
    enabled: taskIds.length > 0,
    staleTime: 30000,
  });
}

export default useTaskLabelsMap;
