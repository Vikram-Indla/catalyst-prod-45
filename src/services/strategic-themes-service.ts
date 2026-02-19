import { supabase } from '@/integrations/supabase/client';
import type { StrategicTheme, ThemeGroup, ThemeMilestone } from '@/types/strategic-themes';

// Helper: typed query for tables/views not yet in generated types
const from = (table: string) => supabase.from(table as any);

// ═══ THEMES ═══
export async function fetchThemes() {
  const { data, error } = await from('es_themes_list_view')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StrategicTheme[];
}

export async function fetchThemeById(id: string) {
  const { data, error } = await from('es_themes_list_view')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as StrategicTheme | null;
}

export async function createTheme(theme: Partial<StrategicTheme>) {
  const { data, error } = await from('es_strategic_themes')
    .insert(theme)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTheme(id: string, updates: Partial<StrategicTheme>) {
  const { data, error } = await from('es_strategic_themes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTheme(id: string) {
  const { error } = await from('es_strategic_themes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ═══ THEME GROUPS ═══
export async function fetchThemeGroups() {
  const { data, error } = await from('es_theme_groups')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ThemeGroup[];
}

export async function createThemeGroup(group: Partial<ThemeGroup>) {
  const { data, error } = await from('es_theme_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ═══ MILESTONES ═══
export async function fetchMilestones(themeId: string) {
  const { data, error } = await from('es_theme_milestones')
    .select('*')
    .eq('theme_id', themeId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ThemeMilestone[];
}

export async function createMilestone(milestone: Partial<ThemeMilestone>) {
  const { data, error } = await from('es_theme_milestones')
    .insert(milestone)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMilestone(id: string, updates: Partial<ThemeMilestone>) {
  const { data, error } = await from('es_theme_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMilestone(id: string) {
  const { error } = await from('es_theme_milestones')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ═══ GOALS (for drawer) ═══
export interface ThemeGoal {
  id: string;
  title: string;
  status: string;
  progress_pct: number;
  kr_count: number;
}

export async function fetchGoalsForTheme(themeId: string): Promise<ThemeGoal[]> {
  const { data: goals, error } = await from('es_goals')
    .select('id, title, status, progress_pct')
    .eq('theme_id', themeId)
    .order('created_at');
  if (error) throw new Error(error.message);
  if (!goals || goals.length === 0) return [];

  // Get KR counts per goal
  const goalIds = goals.map((g: any) => g.id);
  const { data: krs, error: krErr } = await from('es_key_results')
    .select('id, goal_id')
    .in('goal_id', goalIds);
  if (krErr) throw new Error(krErr.message);

  const krMap: Record<string, number> = {};
  (krs ?? []).forEach((kr: any) => {
    krMap[kr.goal_id] = (krMap[kr.goal_id] || 0) + 1;
  });

  return goals.map((g: any) => ({
    id: g.id,
    title: g.title,
    status: g.status || 'active',
    progress_pct: Number(g.progress_pct) || 0,
    kr_count: krMap[g.id] || 0,
  }));
}

// ═══ INITIATIVES (for drawer) ═══
export interface ThemeInitiative {
  id: string;
  title: string;
  status: string;
  progress_pct: number;
  budget_allocated: number;
  budget_spent: number;
}

export async function fetchInitiativesForTheme(themeId: string): Promise<ThemeInitiative[]> {
  // initiatives → key_results → goals → theme
  const { data: goals, error: gErr } = await from('es_goals')
    .select('id')
    .eq('theme_id', themeId);
  if (gErr) throw new Error(gErr.message);
  if (!goals || goals.length === 0) return [];

  const goalIds = goals.map((g: any) => g.id);
  const { data: krs, error: krErr } = await from('es_key_results')
    .select('id')
    .in('goal_id', goalIds);
  if (krErr) throw new Error(krErr.message);
  if (!krs || krs.length === 0) return [];

  const krIds = krs.map((kr: any) => kr.id);
  const { data: initiatives, error: iniErr } = await from('es_initiatives')
    .select('id, title, status, progress_pct, budget_allocated, budget_spent')
    .in('key_result_id', krIds);
  if (iniErr) throw new Error(iniErr.message);

  return (initiatives ?? []).map((i: any) => ({
    id: i.id,
    title: i.title,
    status: i.status || 'active',
    progress_pct: Number(i.progress_pct) || 0,
    budget_allocated: Number(i.budget_allocated) || 0,
    budget_spent: Number(i.budget_spent) || 0,
  }));
}

// ═══ TIMELINE ═══
export async function fetchTimelineData() {
  const { data, error } = await from('es_themes_timeline_view')
    .select('*');
  if (error) throw new Error(error.message);
  return data ?? [];
}
