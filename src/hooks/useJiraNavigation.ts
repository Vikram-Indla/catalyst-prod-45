import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { JiraUserPreferences, ProjectSummary } from '@/types/jira';

export function useJiraPreferences() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['jira-preferences', user?.id],
    queryFn: async (): Promise<JiraUserPreferences | null> => {
      if (!user) return null;
      
      const { data, error } = await (supabase as any)
        .from('jira_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRecentProjects() {
  const { user } = useAuth();
  const { data: prefs } = useJiraPreferences();
  
  return useQuery({
    queryKey: ['recent-projects', prefs?.recent_projects],
    queryFn: async (): Promise<ProjectSummary[]> => {
      if (!prefs?.recent_projects?.length) return [];
      
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('id, name, key, color, project_type')
        .in('id', prefs.recent_projects);
      
      if (error) throw error;
      
      // Maintain order from preferences
      return prefs.recent_projects
        .map((id: string) => data?.find((p: ProjectSummary) => p.id === id))
        .filter((p: ProjectSummary | undefined): p is ProjectSummary => p !== undefined);
    },
    enabled: !!user && !!prefs?.recent_projects?.length,
  });
}

export function useStarredProjects() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['starred-projects', user?.id],
    queryFn: async (): Promise<ProjectSummary[]> => {
      if (!user) return [];
      
      const { data, error } = await (supabase as any)
        .from('project_stars')
        .select(`
          project_id,
          project:projects!inner(id, name, key, color, project_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data?.map((d: any) => d.project as ProjectSummary) || [];
    },
    enabled: !!user,
  });
}

export function useUpdateRecentProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await (supabase as any).rpc('update_recent_project', {
        p_project_id: projectId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
    },
  });
}

export function useToggleProjectStar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ projectId, isStarred }: { projectId: string; isStarred: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isStarred) {
        const { error } = await (supabase as any)
          .from('project_stars')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', projectId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('project_stars')
          .insert({ user_id: user.id, project_id: projectId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['starred-projects'] });
    },
  });
}

export function useIsProjectStarred(projectId: string | undefined) {
  const { data: starred } = useStarredProjects();
  return starred?.some(p => p.id === projectId) ?? false;
}
