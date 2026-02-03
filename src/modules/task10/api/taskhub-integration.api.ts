// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ TASKHUB INTEGRATION API
// Fetch and suggest tasks from TaskHub for Top 10 prioritization
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10AISuggestionPriority } from '../types';

export interface TaskHubTask {
  id: string;
  task_key: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  status_id: string | null;
  workstream_id: string | null;
  workstream?: {
    name: string;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  status?: {
    name: string;
    is_completed_status: boolean;
  } | null;
}

/**
 * Fetch TaskHub tasks that are candidates for AI suggestions
 * Excludes completed tasks and tasks already in the current week
 */
export async function fetchTaskHubTasksForSuggestion(
  listId: string,
  weekId: string,
  limit: number = 10
): Promise<TaskHubTask[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get task keys already in the week
  const { data: existingItems } = await supabase
    .from('t10_items')
    .select('taskhub_key')
    .eq('week_id', weekId)
    .not('taskhub_key', 'is', null);

  const existingKeys = existingItems?.map(i => i.taskhub_key).filter(Boolean) || [];

  // Get task keys already suggested for this list
  const { data: existingSuggestions } = await supabase
    .from('t10_ai_suggestions')
    .select('taskhub_key')
    .eq('list_id', listId)
    .eq('is_added', false)
    .not('taskhub_key', 'is', null);

  const suggestedKeys = existingSuggestions?.map(s => s.taskhub_key).filter(Boolean) || [];
  const excludeKeys = [...existingKeys, ...suggestedKeys];

  // Fetch TaskHub tasks - prioritize by:
  // 1. Assigned to current user
  // 2. Has due date soon
  // 3. High priority
  let query = supabase
    .from('planner_tasks')
    .select(`
      id,
      task_key,
      title,
      priority,
      assignee_id,
      due_date,
      status_id,
      workstream_id,
      assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, avatar_url),
      status:planner_statuses!planner_tasks_status_id_fkey(name, is_completed_status),
      workstream:planner_workstreams!planner_tasks_workstream_id_fkey(name)
    `)
    .eq('is_archived', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: true })
    .limit(limit + excludeKeys.length); // Fetch extra to account for exclusions

  const { data: tasks, error } = await query;

  if (error) throw new Error(error.message);

  // Filter out excluded keys and completed tasks
  const filteredTasks = (tasks || [])
    .filter((t: any) => {
      // Exclude already added keys
      if (excludeKeys.includes(t.task_key)) return false;
      // Exclude completed tasks
      if (t.status?.is_completed_status) return false;
      return true;
    })
    .slice(0, limit);

  return filteredTasks as TaskHubTask[];
}

/**
 * Map TaskHub priority to T10 priority
 */
function mapPriority(taskHubPriority: string): T10AISuggestionPriority {
  switch (taskHubPriority?.toLowerCase()) {
    case 'critical':
    case 'blocker':
      return 'critical';
    case 'high':
      return 'high';
    case 'low':
    case 'minor':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Generate AI suggestions from TaskHub tasks
 */
export async function generateT10SuggestionsFromTaskHub(
  listId: string,
  weekId: string,
  count: number = 5
): Promise<{ created: number; tasks: TaskHubTask[] }> {
  // Fetch candidate tasks
  const tasks = await fetchTaskHubTasksForSuggestion(listId, weekId, count);

  if (tasks.length === 0) {
    return { created: 0, tasks: [] };
  }

  // Create suggestions for each task
  const suggestions = tasks.map(task => ({
    list_id: listId,
    title: task.title,
    taskhub_key: task.task_key,
    assignee_id: task.assignee_id,
    priority: mapPriority(task.priority),
    due_date: task.due_date,
    is_added: false,
  }));

  const { data, error } = await supabase
    .from('t10_ai_suggestions')
    .insert(suggestions)
    .select();

  if (error) throw new Error(error.message);

  return { created: data?.length || 0, tasks };
}

/**
 * Clear all unadded suggestions for a list
 */
export async function clearT10Suggestions(listId: string): Promise<void> {
  const { error } = await supabase
    .from('t10_ai_suggestions')
    .delete()
    .eq('list_id', listId)
    .eq('is_added', false);

  if (error) throw new Error(error.message);
}
