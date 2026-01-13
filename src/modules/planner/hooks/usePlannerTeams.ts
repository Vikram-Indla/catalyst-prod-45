// ============================================================
// PLANNER TEAMS HOOK
// Fetches teams for the team dropdown with member counts
// Returns empty list when database is empty (no mock data)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTeam } from '../types';

export function usePlannerTeams() {
  return useQuery({
    queryKey: ['planner-teams'],
    queryFn: async () => {
      // Fetch teams with member count
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, 
          name, 
          short_name, 
          team_type,
          description,
          team_members(count)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching teams:', error);
        return [];
      }

      const teams: PlannerTeam[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name || team.name.slice(0, 3).toUpperCase(),
        description: team.description || undefined,
        memberCount: team.team_members?.[0]?.count || 0,
        color: getTeamColor(team.team_type),
      }));

      return teams;
    },
  });
}

function getTeamColor(teamType: string | null): string {
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
