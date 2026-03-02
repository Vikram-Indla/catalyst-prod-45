/**
 * useUserContext — Fetches the current user's identity, role, projects, and team.
 * Adapts to ph_issues schema: assignee_display_name (text), not UUID.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserContext {
  userId: string;
  displayName: string;
  role: string;
  department: string;
  avatar: string;
  projectKeys: string[];
  projectNames: Record<string, string>;
  teamMemberNames: string[];
}

export function useUserContext() {
  return useQuery({
    queryKey: ['user-context-personalized'],
    queryFn: async (): Promise<UserContext> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile with role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      // Derive project membership from involvement in ph_issues (by display name)
      const { data: projectData } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .or(`assignee_display_name.eq.${displayName},reporter_display_name.eq.${displayName}`)
        .is('jira_removed_at', null)
        .limit(500);

      const projectMap: Record<string, string> = {};
      (projectData || []).forEach(row => {
        if (row.project_key && row.project_name) {
          projectMap[row.project_key] = row.project_name;
        }
      });

      // If no personal involvement found, show all projects
      let projectKeys = Object.keys(projectMap);
      if (projectKeys.length === 0) {
        const { data: allProjects } = await supabase
          .from('ph_issues')
          .select('project_key, project_name')
          .is('jira_removed_at', null)
          .limit(1000);
        
        (allProjects || []).forEach(row => {
          if (row.project_key && row.project_name) {
            projectMap[row.project_key] = row.project_name;
          }
        });
        projectKeys = Object.keys(projectMap);
      }

      // Get team members (same projects)
      let teamMemberNames: string[] = [];
      if (projectKeys.length > 0) {
        const { data: teamData } = await supabase
          .from('ph_issues')
          .select('assignee_display_name')
          .in('project_key', projectKeys)
          .is('jira_removed_at', null)
          .not('assignee_display_name', 'is', null)
          .not('assignee_display_name', 'eq', displayName)
          .limit(300);

        teamMemberNames = [...new Set((teamData || []).map(d => d.assignee_display_name).filter(Boolean) as string[])];
      }

      return {
        userId: user.id,
        displayName,
        role: profile?.role || 'Team Member',
        department: '',
        avatar: (displayName || 'U')[0].toUpperCase(),
        projectKeys,
        projectNames: projectMap,
        teamMemberNames,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
