/**
 * Subtask Service - CRUD operations for Subtasks
 */

import { supabase } from '@/integrations/supabase/client';
import type { Subtask, SubtaskType, SubtaskStatus } from '@/types/subtask';

export async function getSubtasksByStory(storyId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select(`
      *,
      assignee:profiles!subtasks_assignee_id_fkey(id, full_name, avatar_url),
      release:releases(id, name),
      change_number:change_numbers(id, number)
    `)
    .eq('story_id', storyId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as Subtask[];
}

export async function getSubtask(subtaskId: string): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .select(`
      *,
      assignee:profiles!subtasks_assignee_id_fkey(id, full_name, avatar_url),
      release:releases(id, name),
      change_number:change_numbers(id, number)
    `)
    .eq('id', subtaskId)
    .single();

  if (error) throw error;
  return data as unknown as Subtask;
}

export async function createSubtask(input: {
  story_id: string;
  name: string;
  type: SubtaskType;
  description?: string;
  assignee_id?: string;
  release_id?: string;
  change_number_id?: string;
}): Promise<Subtask> {
  // Get next order index
  const { count } = await supabase
    .from('subtasks')
    .select('*', { count: 'exact', head: true })
    .eq('story_id', input.story_id);

  const { data, error } = await supabase
    .from('subtasks')
    .insert([{
      story_id: input.story_id,
      name: input.name,
      type: input.type,
      description: input.description || null,
      assignee_id: input.assignee_id || null,
      release_id: input.release_id || null,
      change_number_id: input.change_number_id || null,
      status: 'todo' as const,
      order_index: count || 0,
    }])
    .select(`
      *,
      assignee:profiles!subtasks_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as unknown as Subtask;
}

export async function updateSubtask(
  subtaskId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    type: SubtaskType;
    status: SubtaskStatus;
    assignee_id: string | null;
    release_id: string | null;
    change_number_id: string | null;
  }>
): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select(`
      *,
      assignee:profiles!subtasks_assignee_id_fkey(id, full_name, avatar_url),
      release:releases(id, name),
      change_number:change_numbers(id, number)
    `)
    .single();

  if (error) throw error;
  return data as unknown as Subtask;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) throw error;
}

export async function toggleSubtaskDone(subtaskId: string, currentStatus: SubtaskStatus): Promise<Subtask> {
  const newStatus: SubtaskStatus = currentStatus === 'done' ? 'todo' : 'done';
  return updateSubtask(subtaskId, { status: newStatus });
}
