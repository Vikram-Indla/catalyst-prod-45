// ============================================================
// PLANNER WORKSTREAMS HOOK
// Fetches workstreams from planner_workstreams with task counts
// Must use planner_workstreams (not teams) to match planner_tasks.workstream_id
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTeam } from '../types';

export function usePlannerWorkstreams() {
  return useQuery({
    queryKey: ['planner-workstreams'],
    queryFn: async () => {
      // Fetch from planner_workstreams (the correct FK target for planner_tasks)
      const { data: workstreamsData, error: workstreamsError } = await supabase
        .from('planner_workstreams')
        .select('id, name')
        .order('name');

      if (workstreamsError) {
        console.error('Error fetching planner workstreams:', workstreamsError);
        return [];
      }

      // Fetch task counts per workstream
      const { data: taskCounts, error: countError } = await supabase
        .from('planner_tasks')
        .select('workstream_id')
        .is('deleted_at', null);

      if (countError) {
        console.error('Error fetching task counts:', countError);
      }

      // Count tasks per workstream
      const countMap: Record<string, number> = {};
      (taskCounts || []).forEach((t: any) => {
        if (t.workstream_id) {
          countMap[t.workstream_id] = (countMap[t.workstream_id] || 0) + 1;
        }
      });

      const workstreams: PlannerTeam[] = (workstreamsData || []).map(ws => ({
        id: ws.id,
        name: ws.name,
        shortName: ws.name.slice(0, 3).toUpperCase(),
        description: undefined,
        memberCount: countMap[ws.id] || 0, // Shows task count, not member count
        color: '#10b981', // Default green
        leadId: undefined,
      }));

      return workstreams;
    },
  });
}

// Alias for backward compatibility
export const usePlannerTeams = usePlannerWorkstreams;
