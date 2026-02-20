/**
 * WorkItem CRUD Service — Interfaces with ph_work_items and related tables
 */
import { supabase } from '@/integrations/supabase/client';

export interface CreateWorkItemInput {
  project_id: string;
  type_id: string;
  status_id: string;
  title: string;
  item_type: string;
  summary?: string;
  description?: string;
  priority?: string;
  assignee_id?: string | null;
  parent_id?: string | null;
  due_date?: string | null;
  story_points?: number | null;
  is_flagged?: boolean;
}

export interface UpdateWorkItemInput {
  title?: string;
  summary?: string;
  description?: string;
  status_id?: string;
  type_id?: string;
  priority?: string;
  assignee_id?: string | null;
  parent_id?: string | null;
  due_date?: string | null;
  story_points?: number | null;
  is_flagged?: boolean;
  resolution?: string | null;
  time_estimate?: number | null;
  start_date?: string | null;
}

export async function createWorkItem(input: CreateWorkItemInput) {
  // Get the next sequence number for item_key generation
  const { data: seqData } = await supabase
    .from('ph_work_items')
    .select('sequence_num')
    .eq('project_id', input.project_id)
    .order('sequence_num', { ascending: false })
    .limit(1);

  const nextSeq = ((seqData?.[0]?.sequence_num as number) || 0) + 1;

  // Get the project key for item_key
  const { data: proj } = await supabase
    .from('ph_projects')
    .select('key')
    .eq('id', input.project_id)
    .single();

  const itemKey = `${proj?.key || 'PROJ'}-${nextSeq}`;

  const { data, error } = await supabase
    .from('ph_work_items')
    .insert({
      project_id: input.project_id,
      type_id: input.type_id,
      status_id: input.status_id,
      title: input.title,
      summary: input.title,
      item_type: input.item_type,
      item_key: itemKey,
      sequence_num: nextSeq,
      description: input.description || null,
      priority: input.priority || 'Medium',
      assignee_id: input.assignee_id || null,
      parent_id: input.parent_id || null,
      due_date: input.due_date || null,
      story_points: input.story_points || null,
      is_flagged: input.is_flagged || false,
      sort_order: 0,
    })
    .select('id, item_key, title, summary')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkItem(id: string) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select(`
      *,
      ph_work_types!ph_work_items_type_id_fkey (id, name, color, icon, level),
      ph_workflow_statuses!ph_work_items_status_id_fkey (id, name, category, color)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  // Fetch assignee profile
  if (data?.assignee_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', data.assignee_id)
      .single();
    (data as any).assignee_profile = profile;
  }

  return data;
}

export async function updateWorkItem(
  id: string,
  changes: UpdateWorkItemInput,
  userId?: string
) {
  // Fetch current values for audit logging
  const { data: current } = await supabase
    .from('ph_work_items')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) throw new Error('Work item not found');

  const { data, error } = await supabase
    .from('ph_work_items')
    .update(changes)
    .eq('id', id)
    .select('id, item_key')
    .single();

  if (error) throw new Error(error.message);

  // Auto-resolve userId if not provided
  let actorId = userId;
  if (!actorId) {
    const { data: { user } } = await supabase.auth.getUser();
    actorId = user?.id ?? undefined;
  }

  // Log each changed field to activity log
  if (actorId) {
    const logs: any[] = [];
    for (const [key, newVal] of Object.entries(changes)) {
      const oldVal = (current as any)[key];
      if (String(oldVal) !== String(newVal)) {
        logs.push({
          work_item_id: id,
          user_id: actorId,
          action: 'updated',
          field_name: key,
          old_value: oldVal != null ? String(oldVal) : null,
          new_value: newVal != null ? String(newVal) : null,
        });
      }
    }
    if (logs.length > 0) {
      await supabase.from('ph_activity_log').insert(logs);
    }
  }

  return data;
}

export async function deleteWorkItem(id: string) {
  const { error } = await supabase
    .from('ph_work_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
