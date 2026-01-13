// ============================================================
// PLANNER TEAMS HOOK
// Fetches teams for the team dropdown
// Falls back to seed data when database is empty
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTeam } from '../types';
import { SEED_TEAMS } from '../data/seedData';

export function usePlannerTeams() {
  return useQuery({
    queryKey: ['planner-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name, team_type')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching teams:', error);
        // Return seed data on error
        return SEED_TEAMS;
      }

      const teams: PlannerTeam[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name || team.name.slice(0, 3).toUpperCase(),
        memberCount: 0, // Would need additional query
        color: getTeamColor(team.team_type),
      }));

      // If no data from DB, return seed data
      if (teams.length === 0) {
        return SEED_TEAMS;
      }

      return teams;
    },
  });
}

function getTeamColor(teamType: string): string {
  const colors: Record<string, string> = {
    'AGILE': '#10b981',
    'KANBAN': '#3b82f6',
    'COP': '#d97706',
    'PROGRAM': '#7c3aed',
    'PORTFOLIO': '#6366f1',
  };
  return colors[teamType] || '#6b7280';
}
