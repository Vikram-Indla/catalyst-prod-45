// ============================================================
// useTaskDetailMutations Hook
// All mutation operations for the task detail modal
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTaskDetailMutations(taskId: string | null) {
  const queryClient = useQueryClient();

  // Update task field
  const updateField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!taskId) throw new Error('No task ID');

      const { error } = await supabase
        .from('planner_tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail-modal', taskId] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async (statusId: string) => {
      if (!taskId) throw new Error('No task ID');

      const { error } = await supabase
        .from('planner_tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail-modal', taskId] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
      toast.success('Status updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  // Add note
  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!taskId) throw new Error('No task ID');

      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('planner_task_lead_notes')
        .insert([{
          task_id: taskId,
          content: content,
          author_id: userData.user?.id || '',
        }]);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail-notes', taskId] });
      toast.success('Note added');
    },
    onError: (err: Error) => {
      toast.error(`Failed to add note: ${err.message}`);
    },
  });

  // Add external link
  const addLink = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      if (!taskId) throw new Error('No task ID');

      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('task_external_links')
        .insert([{
          task_id: taskId,
          url,
          title,
          created_by: userData.user?.id,
        }]);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail-links', taskId] });
      toast.success('Link added');
    },
    onError: (err: Error) => {
      toast.error(`Failed to add link: ${err.message}`);
    },
  });

  // Delete external link
  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('task_external_links')
        .delete()
        .eq('id', linkId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail-links', taskId] });
      toast.success('Link removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove link: ${err.message}`);
    },
  });

  return {
    updateField,
    updateStatus,
    addNote,
    addLink,
    deleteLink,
  };
}
