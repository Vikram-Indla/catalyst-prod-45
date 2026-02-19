import { supabase } from '@/integrations/supabase/client';
import type { StrategicTheme, ThemeGroup, ThemeMilestone } from '@/types/strategic-themes';

// Helper: typed query for tables/views not yet in generated types
const from = (table: string) => supabase.from(table as any);

// ═══ THEMES ═══
export async function fetchThemes() {
  const { data, error } = await from('es_themes_list_view')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as StrategicTheme[];
}

export async function fetchThemeById(id: string) {
  const { data, error } = await from('es_themes_list_view')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StrategicTheme | null;
}

export async function createTheme(theme: Partial<StrategicTheme>) {
  const { data, error } = await from('es_strategic_themes')
    .insert(theme)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTheme(id: string, updates: Partial<StrategicTheme>) {
  const { data, error } = await from('es_strategic_themes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTheme(id: string) {
  const { error } = await from('es_strategic_themes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ═══ THEME GROUPS ═══
export async function fetchThemeGroups() {
  const { data, error } = await from('es_theme_groups')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as ThemeGroup[];
}

export async function createThemeGroup(group: Partial<ThemeGroup>) {
  const { data, error } = await from('es_theme_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ═══ MILESTONES ═══
export async function fetchMilestones(themeId: string) {
  const { data, error } = await from('es_theme_milestones')
    .select('*')
    .eq('theme_id', themeId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as ThemeMilestone[];
}

export async function createMilestone(milestone: Partial<ThemeMilestone>) {
  const { data, error } = await from('es_theme_milestones')
    .insert(milestone)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMilestone(id: string, updates: Partial<ThemeMilestone>) {
  const { data, error } = await from('es_theme_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMilestone(id: string) {
  const { error } = await from('es_theme_milestones')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ═══ TIMELINE ═══
export async function fetchTimelineData() {
  const { data, error } = await from('es_themes_timeline_view')
    .select('*');
  if (error) throw error;
  return data ?? [];
}
