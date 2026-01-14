// ============================================================
// TASK DETAIL HOOKS
// Hooks for task dependencies, checklist, attachments, activity
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// GUARDRAIL: No toasts in hooks - silent operations


// ============================================================
// TASK DEPENDENCIES
// ============================================================

export interface TaskDependency {
  id: string;
  dependency_type: 'blocked_by' | 'blocks' | 'related';
  linked_task: {
    id: string;
    key: string;
    title: string;
    status?: { slug: string; name: string; color: string };
  };
}

export function useTaskDependencies(taskId: string | null) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          id,
          dependency_type,
          depends_on_task_id
        `)
        .eq('task_id', taskId);
      
      if (error) throw error;
      
      // Fetch linked task details
      if (!data || data.length === 0) return [];
      
      const linkedTaskIds = data.map(d => d.depends_on_task_id);
      const { data: linkedTasks } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          key,
          title,
          status:planner_statuses(slug, name, color)
        `)
        .in('id', linkedTaskIds);
      
      return data.map(dep => ({
        id: dep.id,
        dependency_type: dep.dependency_type as TaskDependency['dependency_type'],
        linked_task: linkedTasks?.find(t => t.id === dep.depends_on_task_id) || {
          id: dep.depends_on_task_id,
          key: 'Unknown',
          title: 'Unknown Task',
        },
      })) as TaskDependency[];
    },
    enabled: !!taskId,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      dependsOnTaskId, 
      type 
    }: { 
      taskId: string; 
      dependsOnTaskId: string; 
      type: string;
    }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({ 
          task_id: taskId, 
          depends_on_task_id: dependsOnTaskId, 
          dependency_type: type 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
    onError: (error) => {
      console.error('Failed to add dependency:', error);
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
    },
  });
}

// ============================================================
// TASK CHECKLIST
// ============================================================

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  completed_at: string | null;
}

export function useTaskChecklist(taskId: string | null) {
  return useQuery({
    queryKey: ['task-checklist', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', taskId)
        .order('position');
      
      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!taskId,
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({ 
          is_completed, 
          completed_at: is_completed ? new Date().toISOString() : null 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist'] });
    },
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, text }: { taskId: string; text: string }) => {
      const { data: existing } = await supabase
        .from('task_checklist_items')
        .select('position')
        .eq('task_id', taskId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (existing?.[0]?.position ?? -1) + 1;
      
      const { error } = await supabase
        .from('task_checklist_items')
        .insert({ task_id: taskId, text, position: nextPosition });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist'] });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist'] });
    },
  });
}

// ============================================================
// TASK ATTACHMENTS
// ============================================================

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function useTaskAttachments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments'] });
    },
  });
}

// ============================================================
// TASK COMMENTS
// ============================================================

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:profiles!task_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, content, authorId }: { taskId: string; content: string; authorId: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, content, author_id: authorId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments'] });
    },
  });
}

// ============================================================
// TASK ACTIVITY
// ============================================================

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useTaskActivity(taskId: string | null) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_activity')
        .select(`
          *,
          actor:profiles!task_activity_actor_id_fkey(id, full_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as TaskActivity[];
    },
    enabled: !!taskId,
  });
}
