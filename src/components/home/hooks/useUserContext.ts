/**
 * useUserContext — Fetches the current user's identity, BUSINESS role, projects, and team.
 * NEVER shows "admin" or "authenticated" as the display role.
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

/** Resolve business role — NEVER return 'admin' or 'authenticated' */
async function fetchBusinessRole(userId: string, profileRole: string | null): Promise<string> {
  // If profile has a real business role, use it
  if (profileRole && profileRole !== 'admin' && profileRole !== 'authenticated' && profileRole !== 'user') {
    return profileRole;
  }

  // Check user_roles table
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (userRole?.role && String(userRole.role) !== 'admin' && String(userRole.role) !== 'authenticated' && String(userRole.role) !== 'user') {
    // Convert enum values to display labels
    const roleLabels: Record<string, string> = {
      program_manager: 'Program Manager',
      delivery_manager: 'Delivery Manager',
      team_lead: 'Team Lead',
      product_owner: 'Product Owner',
      developer: 'Developer',
      qa_lead: 'QA Lead',
      director: 'Director',
      moderator: 'Team Lead',
    };
    return roleLabels[userRole.role] || userRole.role;
  }

  return 'Team Member';
}

export function useUserContext() {
  return useQuery({
    queryKey: ['user-context-personalized'],
    queryFn: async (): Promise<UserContext> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      // Resolve business role
      const role = await fetchBusinessRole(user.id, profile?.role || null);

      // Derive project membership from ph_issues activity — case-insensitive match
      const nameLower = displayName.toLowerCase();
      const { data: projectData } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .or(`assignee_display_name.ilike.${nameLower},reporter_display_name.ilike.${nameLower}`)
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

      // Sort projects by recent activity (top 4 first, then rest)
      // We'll use the count of items updated in last 14 days per project
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data: activityData } = await supabase
        .from('ph_issues')
        .select('project_key')
        .in('project_key', projectKeys)
        .is('jira_removed_at', null)
        .gte('jira_updated_at', fourteenDaysAgo)
        .limit(500);

      const activityCount: Record<string, number> = {};
      (activityData || []).forEach(row => {
        activityCount[row.project_key] = (activityCount[row.project_key] || 0) + 1;
      });

      projectKeys.sort((a, b) => (activityCount[b] || 0) - (activityCount[a] || 0));

      // Get team members
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
        role,
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
