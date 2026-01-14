// ============================================================
// PLANNER WORKSTREAMS HOOK
// Fetches workstreams for the workstream dropdown with member counts
// Returns empty list when database is empty (no mock data)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTeam } from '../types';

export function usePlannerWorkstreams() {
  return useQuery({
    queryKey: ['planner-workstreams'],
    queryFn: async () => {
      // Fetch workstreams (teams table) with lead info
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, 
          name, 
          short_name, 
          team_type,
          description,
          lead_id
        `)
        .eq('is_active', true)
        .order('name');

      if (teamsError) {
        console.error('Error fetching workstreams:', teamsError);
        return [];
      }

      // Fetch member counts separately for accuracy
      const { data: memberCounts, error: countError } = await supabase
        .from('team_members')
        .select('team_id');

      if (countError) {
        console.error('Error fetching member counts:', countError);
      }

      // Count members per team
      const countMap: Record<string, number> = {};
      (memberCounts || []).forEach((m: any) => {
        countMap[m.team_id] = (countMap[m.team_id] || 0) + 1;
      });

      const workstreams: PlannerTeam[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name || team.name.slice(0, 3).toUpperCase(),
        description: team.description || undefined,
        memberCount: countMap[team.id] || 0,
        color: getWorkstreamColor(team.team_type),
        leadId: team.lead_id || undefined,
      }));

      return workstreams;
    },
  });
}

// Alias for backward compatibility
export const usePlannerTeams = usePlannerWorkstreams;

function getWorkstreamColor(teamType: string | null): string {
  if (!teamType) return '#6b7280';
  const colors: Record<string, string> = {
    'AGILE': '#10b981',
    'KANBAN': '#3b82f6',
    'COP': '#d97706',
    'PROGRAM': '#7c3aed',
    'PORTFOLIO': '#6366f1',
  };
  return colors[teamType] || '#6b7280';
}
