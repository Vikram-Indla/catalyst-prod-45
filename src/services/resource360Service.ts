import { supabase } from '@/integrations/supabase/client';

// ── Resource Profile ──
export const fetchResource = async (rid: string) => {
  const { data, error } = await supabase
    .from('r360_resources' as any)
    .select(`
      *,
      r360_departments(name),
      r360_vendors(name),
      r360_assignments(name)
    `)
    .eq('rid', rid)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Resource with RID "${rid}" not found`);
  return data as any;
};

// ── Summary Stats ──
export const fetchResourceSummary = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_resource_summary_view' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
};

// ── Work Items (Enriched) ──
export const fetchWorkItems = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_work_items_enriched_view' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .order('assigned_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── Status Transitions (for Context Modal) ──
export const fetchTransitions = async (workItemId: string) => {
  const { data, error } = await supabase
    .from('r360_status_transitions' as any)
    .select('*')
    .eq('work_item_id', workItemId)
    .order('transitioned_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── Chronology Events ──
export const fetchChronologyEvents = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_chronology_events_view' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .order('event_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── Gantt Data ──
export const fetchGanttData = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_gantt_view' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .order('bar_start', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── Constellation (Team View) ──
export const fetchConstellation = async () => {
  const { data, error } = await supabase
    .from('r360_constellation_view' as any)
    .select('*')
    .order('total_items', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── Hub Distribution ──
export const fetchHubDistribution = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_resource_hub_distribution_view' as any)
    .select('*')
    .eq('resource_id', resourceId);
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── AI Profile ──
export const fetchAiProfile = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_ai_profiles' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .maybeSingle();
  if (error) throw error;
  return data as any | null;
};

// ── AI Behavioral Patterns ──
export const fetchBehavioralPatterns = async (resourceId: string) => {
  const { data, error } = await supabase
    .from('r360_ai_behavioral_patterns' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
};

// ── AI Release Standing ──
export const fetchReleaseStanding = async (resourceId: string, releaseId: string) => {
  const { data, error } = await supabase
    .from('r360_ai_release_standings' as any)
    .select('*')
    .eq('resource_id', resourceId)
    .eq('release_id', releaseId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as any | null;
};
