import { supabase } from '@/integrations/supabase/client';

// ── Resource Profile — Always sourced from resource_inventory (/admin/users) ──
export const fetchResource = async (rid: string) => {
  const { data: ri, error } = await supabase
    .from('resource_inventory')
    .select('rid, name, role_name, profile_id, department_id, assignment_id, vendor_id, vendor_name, department_name, location_id, email, is_active')
    .eq('rid', rid)
    .maybeSingle();
  if (error) throw error;
  if (!ri) throw new Error(`Resource with RID "${rid}" not found`);

  const r = ri as any;

  // Fetch lookups + avatar in parallel
  const [{ data: depts }, { data: assignments }, { data: locations }, profileResult] = await Promise.all([
    supabase.from('capacity_departments').select('id, name'),
    supabase.from('resource_assignments').select('id, name'),
    supabase.from('resource_locations').select('id, name'),
    r.profile_id
      ? supabase.from('profiles').select('id, avatar_url').eq('id', r.profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
  const assignMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
  const locMap = new Map((locations || []).map((l: any) => [l.id, l.name]));
  const avatar = (profileResult as any)?.data?.avatar_url || null;

  return {
    rid: r.rid,
    id: r.profile_id || r.rid,
    full_name: r.name,
    job_role: r.role_name,
    email: r.email,
    location_type: locMap.get(r.location_id) || null,
    is_active: r.is_active,
    avatar_url: avatar,
    r360_departments: { name: deptMap.get(r.department_id) || r.department_name || null },
    r360_vendors: { name: r.vendor_name || null },
    r360_assignments: { name: assignMap.get(r.assignment_id) || null },
  } as any;
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
