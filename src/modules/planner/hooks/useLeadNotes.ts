/**
 * LEAD NOTES HOOK
 * Fetch and manage lead/manager notes for tasks
 * Access control: only workstream leads or management can add/edit
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export interface LeadNote {
  id: string;
  task_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

/**
 * Hook to fetch lead notes for a task
 */
export function useLeadNotes(taskId: string | null) {
  return useQuery({
    queryKey: ['lead-notes', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('planner_task_lead_notes')
        .select(`
          *,
          author:profiles!planner_task_lead_notes_author_id_fkey(
            id, full_name, email, avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadNote[];
    },
    enabled: !!taskId,
    staleTime: 30000,
  });
}

/**
 * Hook to check if user can manage lead notes for a task
 * Workstream lead OR management role can manage
 */
export function useCanManageLeadNotes(workstreamId: string | null) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isProgramManager, isManagement, isLoading: roleLoading } = useUserRole();

  // Management roles always have access
  const hasManagementAccess = isAdmin || isSuperAdmin || isProgramManager || isManagement;

  // Check if user is workstream lead
  const { data: isLead, isLoading: leadLoading } = useQuery({
    queryKey: ['is-workstream-lead', user?.id, workstreamId],
    queryFn: async () => {
      if (!user || !workstreamId) return false;
      if (hasManagementAccess) return true; // Skip DB check if already has access

      const { data, error } = await supabase
        .from('workstream_members')
        .select('role')
        .eq('workstream_id', workstreamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking lead status:', error);
        return false;
      }

      return data?.role?.toLowerCase() === 'lead';
    },
    enabled: !!user && !!workstreamId && !hasManagementAccess,
    staleTime: 60000,
  });

  return {
    canManage: hasManagementAccess || isLead || false,
    isLoading: roleLoading || (leadLoading && !hasManagementAccess),
  };
}

/**
 * Hook to add a new lead note
 */
export function useAddLeadNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('planner_task_lead_notes')
        .insert({
          task_id: taskId,
          content,
          author_id: user.id,
        })
        .select(`
          *,
          author:profiles!planner_task_lead_notes_author_id_fkey(
            id, full_name, email, avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as LeadNote;
    },
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', taskId] });
      toast.success('Note added');
    },
    onError: (error: any) => {
      console.error('Failed to add note:', error);
      if (error.code === '42501' || error.message?.includes('policy')) {
        toast.error('You do not have permission to add notes');
      } else {
        toast.error('Failed to add note');
      }
    },
  });
}

/**
 * Hook to update a lead note
 */
export function useUpdateLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, content, taskId }: { noteId: string; content: string; taskId: string }) => {
      const { data, error } = await supabase
        .from('planner_task_lead_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select(`
          *,
          author:profiles!planner_task_lead_notes_author_id_fkey(
            id, full_name, email, avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return { data, taskId };
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', taskId] });
      toast.success('Note updated');
    },
    onError: () => {
      toast.error('Failed to update note');
    },
  });
}

/**
 * Hook to delete a lead note
 */
export function useDeleteLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, taskId }: { noteId: string; taskId: string }) => {
      const { error } = await supabase
        .from('planner_task_lead_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', taskId] });
      toast.success('Note deleted');
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });
}
