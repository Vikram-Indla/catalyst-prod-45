// src/hooks/useAccessibleTeams.ts
// Hook to fetch teams accessible to the current user based on their role

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

export interface AccessibleTeam {
  id: string;
  name: string;
  short_name: string;
  team_type: string;
  description?: string;
  project_id?: string;
  is_active: boolean;
  color?: string;
  project_name?: string;
  member_count?: number;
}

export function useAccessibleTeams() {
  const { user } = useAuth();
  const { role, isAdmin, isProgramManager, isLoading: isRoleLoading } = useUserRole();

  return useQuery({
    queryKey: ['accessible-teams', user?.id, role],
    queryFn: async (): Promise<AccessibleTeam[]> => {
      if (!user) return [];

      // Admin and program_manager can see all teams
      if (isAdmin || isProgramManager) {
        const { data, error } = await supabase
          .from('teams')
          .select(`
            id, 
            name, 
            short_name, 
            team_type, 
            description, 
            project_id, 
            is_active,
            projects:projects!project_id(name)
          `)
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching all teams:', error);
          throw error;
        }

        return (data || []).map(team => ({
          id: team.id,
          name: team.name,
          short_name: team.short_name,
          team_type: team.team_type,
          description: team.description,
          project_id: team.project_id,
          is_active: team.is_active,
          project_name: (team.projects as any)?.name,
        }));
      }

      // Regular users and team leads can only see teams they're members of
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams:teams!team_id(
            id, 
            name, 
            short_name, 
            team_type, 
            description, 
            project_id, 
            is_active,
            projects:projects!project_id(name)
          )
        `)
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching user team memberships:', memberError);
        throw memberError;
      }

      // Filter to active teams only
      const teams = (memberTeams || [])
        .filter(m => m.teams && (m.teams as any).is_active)
        .map(m => {
          const team = m.teams as any;
          return {
            id: team.id,
            name: team.name,
            short_name: team.short_name,
            team_type: team.team_type,
            description: team.description,
            project_id: team.project_id,
            is_active: team.is_active,
            project_name: team.projects?.name,
          };
        });

      // Deduplicate by team id
      const uniqueTeams = Array.from(
        new Map(teams.map(t => [t.id, t])).values()
      );

      return uniqueTeams.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user && !isRoleLoading,
  });
}

// Hook to check if current user can see all teams
export function useCanViewAllTeams() {
  const { isAdmin, isProgramManager, isLoading } = useUserRole();
  
  return {
    canViewAllTeams: isAdmin || isProgramManager,
    isLoading,
  };
}
