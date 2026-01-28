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

      // NOTE: Member counts will be populated once workstream_members table is added
      // For now, return 0 to avoid showing mock/incorrect data
      
      const workstreams: PlannerTeam[] = (workstreamsData || []).map(ws => ({
        id: ws.id,
        name: ws.name,
        shortName: ws.name.slice(0, 3).toUpperCase(),
        slug: ws.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: undefined,
        memberCount: 0, // No members table yet - will be wired when resources are added
        color: '#10b981', // Default green
        leadId: undefined,
      }));

      return workstreams;
    },
  });
}

// Alias for backward compatibility
export const usePlannerTeams = usePlannerWorkstreams;
