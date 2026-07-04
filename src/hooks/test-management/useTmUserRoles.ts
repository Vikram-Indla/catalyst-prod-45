// P2-S19: tm_user_roles is a real, RLS-backed table with zero live consumers
// anywhere in the app (0 rows on staging, confirmed via discovery). These hooks
// are the first live reader/writer — used by the Team & roles tab on
// /admin/test-ops and by tm_approve_release_readiness's role gate.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface TmRole {
  id: string;
  name: string;
  description: string | null;
}

export interface TmUserRoleRow {
  id: string;
  user_id: string;
  project_id: string;
  role_id: string;
  assigned_at: string;
  user: { full_name: string | null; email: string | null } | null;
  role: { name: string } | null;
}

export function useTmRoles() {
  return useQuery({
    queryKey: ['tm-roles'],
    queryFn: async (): Promise<TmRole[]> => {
      const { data, error } = await supabase.from('tm_roles').select('id, name, description').order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useTmUserRoles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-user-roles', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<TmUserRoleRow[]> => {
      const { data, error } = await supabase
        .from('tm_user_roles')
        .select('id, user_id, project_id, role_id, assigned_at, user:profiles!tm_user_roles_user_id_fkey(full_name, email), role:tm_roles!tm_user_roles_role_id_fkey(name)')
        .eq('project_id', projectId!)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TmUserRoleRow[];
    },
  });
}

export function useAssignTmUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; userId: string; roleId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tm_user_roles').insert({
        project_id: input.projectId,
        user_id: input.userId,
        role_id: input.roleId,
        assigned_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tm-user-roles', variables.projectId] });
      catalystToast.success('Role assigned');
    },
    onError: (error: Error) => {
      catalystToast.error(error.message.includes('duplicate') ? 'That user already has that role on this project' : error.message);
    },
  });
}

export function useRemoveTmUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; projectId: string }) => {
      const { error } = await supabase.from('tm_user_roles').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tm-user-roles', variables.projectId] });
      catalystToast.success('Role removed');
    },
    onError: (error: Error) => {
      catalystToast.error(error.message);
    },
  });
}
