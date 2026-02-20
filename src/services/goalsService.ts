/**
 * Goals & Key Results — Service Layer
 * Maps DB column names to domain types defined in src/types/goals.ts
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Goal, KeyResult, KRCheckin,
  CreateGoalInput, CreateKRInput, CreateCheckinInput,
} from '@/types/goals';

// ── Mappers ──

function mapGoalRow(row: any): Goal {
  return {
    id: row.id,
    goal_key: row.goal_key ?? '',
    title: row.title,
    description: row.description ?? undefined,
    theme_id: row.theme_id,
    owner_id: row.owner_id ?? undefined,
    status: row.status ?? 'draft',
    priority: row.priority ?? 'medium',
    progress_pct: row.progress_pct ?? 0,
    confidence_level: row.confidence_level ?? 0.5,
    weight: row.weight ?? 1,
    score_override: row.score_override ?? undefined,
    fiscal_quarter: row.fiscal_quarter ?? undefined,
    bsc_perspective: row.bsc_perspective ?? undefined,
    start_date: row.start_date ?? undefined,
    target_date: row.target_date ?? undefined,
    sort_order: row.sort_order ?? 0,
    is_archived: row.is_archived ?? false,
    tags: row.tags ?? [],
    kr_count: row.kr_count ?? 0,
    ai_health_score: row.ai_health_score ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Joined owner data
    owner_name: row.profiles?.full_name ?? undefined,
    owner_avatar: row.profiles?.avatar_url ?? undefined,
  };
}

function mapKRRow(row: any): KeyResult {
  return {
    id: row.id,
    kr_key: row.kr_key ?? '',
    goal_id: row.goal_id,
    title: row.title,
    description: row.description ?? undefined,
    metric_type: row.metric_type ?? 'count',
    metric_unit: row.unit ?? undefined,
    baseline: row.start_value ?? 0,
    target: row.target_value ?? 0,
    current_value: row.current_value ?? 0,
    progress_pct: row.progress_pct ?? 0,
    status: row.status ?? 'not_started',
    owner_id: row.owner_id ?? undefined,
    weight: row.weight ?? 1,
    due_date: row.due_date ?? undefined,
    sort_order: row.sort_order ?? 0,
    check_in_count: row.check_in_count ?? 0,
    last_check_in_at: row.last_check_in_at ?? undefined,
    confidence_level: row.confidence_level ?? 0.5,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_name: row.owner_name,
  };
}

function mapCheckinRow(row: any): KRCheckin {
  return {
    id: row.id,
    key_result_id: row.key_result_id,
    checked_by: row.author_id ?? undefined,
    previous_value: row.previous_value ?? 0,
    new_value: row.value ?? 0,
    delta_value: (row.value ?? 0) - (row.previous_value ?? 0),
    confidence_level: row.confidence_level ?? undefined,
    note: row.notes ?? undefined,
    created_at: row.created_at,
  };
}

// ── Initiative types ──
export interface GoalInitiativeLink {
  id: string;
  goal_id: string;
  initiative_id: string;
  linked_at: string;
  notes?: string;
  initiative?: {
    id: string;
    initiative_key: string;
    title: string;
    status: string;
    department_id?: string;
  };
}

// ── Service ──

export const goalsService = {
  async getGoals(): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('es_goals')
      .select('*, profiles:owner_id (full_name, avatar_url)')
      .eq('is_archived', false)
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(mapGoalRow);
  },

  async getKeyResults(goalId: string): Promise<KeyResult[]> {
    const { data, error } = await supabase
      .from('es_key_results')
      .select('*')
      .eq('goal_id', goalId)
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(mapKRRow);
  },

  async getAllKeyResults(): Promise<KeyResult[]> {
    const { data, error } = await supabase
      .from('es_key_results')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(mapKRRow);
  },

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const { data, error } = await supabase
      .from('es_goals')
      .insert({
        title: input.title,
        description: input.description,
        theme_id: input.theme_id,
        owner_id: input.owner_id,
        status: input.status ?? 'draft',
        priority: input.priority ?? 'medium',
        confidence_level: input.confidence_level ?? 0.5,
        fiscal_quarter: input.fiscal_quarter,
        bsc_perspective: input.bsc_perspective,
        start_date: input.start_date,
        target_date: input.target_date,
        weight: input.weight ?? 1.0,
        tags: input.tags ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return mapGoalRow(data);
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const dbUpdates: Record<string, any> = { ...updates };
    delete dbUpdates.id;
    delete dbUpdates.goal_key;
    delete dbUpdates.created_at;
    delete dbUpdates.owner_name;
    delete dbUpdates.owner_avatar;

    const { data, error } = await supabase
      .from('es_goals')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapGoalRow(data);
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from('es_goals').delete().eq('id', id);
    if (error) throw error;
  },

  async createKR(input: CreateKRInput): Promise<KeyResult> {
    const { data, error } = await supabase
      .from('es_key_results')
      .insert({
        goal_id: input.goal_id,
        title: input.title,
        metric_type: input.metric_type,
        unit: input.metric_unit,
        start_value: input.baseline ?? 0,
        target_value: input.target,
        owner_id: input.owner_id,
        weight: input.weight ?? 1.0,
        due_date: input.due_date,
      })
      .select()
      .single();
    if (error) throw error;
    return mapKRRow(data);
  },

  async updateKR(id: string, updates: Partial<KeyResult>): Promise<KeyResult> {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.metric_type !== undefined) dbUpdates.metric_type = updates.metric_type;
    if (updates.metric_unit !== undefined) dbUpdates.unit = updates.metric_unit;
    if (updates.baseline !== undefined) dbUpdates.start_value = updates.baseline;
    if (updates.target !== undefined) dbUpdates.target_value = updates.target;
    if (updates.current_value !== undefined) dbUpdates.current_value = updates.current_value;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.owner_id !== undefined) dbUpdates.owner_id = updates.owner_id;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;

    const { data, error } = await supabase
      .from('es_key_results')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapKRRow(data);
  },

  async deleteKR(id: string): Promise<void> {
    const { error } = await supabase.from('es_key_results').delete().eq('id', id);
    if (error) throw error;
  },

  async createCheckin(input: CreateCheckinInput): Promise<KRCheckin> {
    const { data: kr } = await supabase
      .from('es_key_results')
      .select('current_value, check_in_count')
      .eq('id', input.key_result_id)
      .single();

    const { data, error } = await supabase
      .from('es_kr_checkins')
      .insert({
        key_result_id: input.key_result_id,
        previous_value: kr?.current_value ?? 0,
        value: input.new_value,
        confidence_level: input.confidence_level,
        notes: input.note,
        check_in_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from('es_key_results')
      .update({
        current_value: input.new_value,
        confidence_level: input.confidence_level != null ? String(input.confidence_level) : undefined,
        check_in_count: (kr?.check_in_count ?? 0) + 1,
        last_check_in_at: new Date().toISOString(),
      })
      .eq('id', input.key_result_id);

    return mapCheckinRow(data);
  },

  async getCheckins(krId: string): Promise<KRCheckin[]> {
    const { data, error } = await supabase
      .from('es_kr_checkins')
      .select('*')
      .eq('key_result_id', krId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCheckinRow);
  },

  async getThemes() {
    const { data, error } = await supabase
      .from('es_strategic_themes')
      .select('id, title, color, status')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  // ── Goal-Initiative linking (Fix 5) ──

  async getGoalInitiatives(goalId: string): Promise<GoalInitiativeLink[]> {
    const { data, error } = await supabase
      .from('es_goal_initiatives')
      .select('*, ph_initiatives!initiative_id (id, initiative_key, title, status, department_id)')
      .eq('goal_id', goalId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      goal_id: row.goal_id,
      initiative_id: row.initiative_id,
      linked_at: row.linked_at,
      notes: row.notes,
      initiative: row.ph_initiatives,
    }));
  },

  async linkInitiative(goalId: string, initiativeId: string): Promise<void> {
    const { error } = await supabase
      .from('es_goal_initiatives')
      .insert({ goal_id: goalId, initiative_id: initiativeId });
    if (error) throw error;
  },

  async unlinkInitiative(id: string): Promise<void> {
    const { error } = await supabase
      .from('es_goal_initiatives')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async searchInitiatives(query: string): Promise<{ id: string; initiative_key: string; title: string; status: string }[]> {
    const { data, error } = await supabase
      .from('ph_initiatives')
      .select('id, initiative_key, title, status')
      .ilike('title', `%${query}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  },
};
