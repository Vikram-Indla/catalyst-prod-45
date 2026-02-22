import { supabase } from '@/integrations/supabase/client';

// ── In-memory LKG cache for resource360 ──
const lkgCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCached<T>(key: string): T | null {
  const entry = lkgCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}
function setCache(key: string, data: any) {
  lkgCache.set(key, { data, ts: Date.now() });
}

// ── Resource Profile — Always sourced from resource_inventory (/admin/users) ──
export const fetchResource = async (rid: string) => {
  const cacheKey = `resource:${rid}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data: ri, error } = await supabase
    .from('resource_inventory')
    .select('rid, name, role_name, profile_id, department_id, assignment_id, vendor_id, vendor_name, department_name, location_id, email, is_active, jira_account_id')
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

  const result = {
    rid: r.rid,
    id: r.profile_id || r.rid,
    full_name: r.name,
    job_role: r.role_name,
    email: r.email,
    location_type: locMap.get(r.location_id) || null,
    is_active: r.is_active,
    avatar_url: avatar,
    jira_account_id: r.jira_account_id || null,
    r360_departments: { name: deptMap.get(r.department_id) || r.department_name || null },
    r360_vendors: { name: r.vendor_name || null },
    r360_assignments: { name: assignMap.get(r.assignment_id) || null },
  } as any;

  setCache(cacheKey, result);
  return result;
};

// ── Summary Stats — computed from ph_issues via jira_account_id ──
export const fetchResourceSummary = async (resourceId: string, jiraAccountId?: string | null) => {
  // If no jira account, try the old view as fallback
  if (!jiraAccountId) {
    const { data, error } = await supabase
      .from('r360_resource_summary_view' as any)
      .select('*')
      .eq('resource_id', resourceId)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  }

  const cacheKey = `summary:${jiraAccountId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data: issues, error } = await supabase
    .from('ph_issues' as any)
    .select('status_category')
    .eq('assignee_account_id', jiraAccountId);
  if (error) throw error;

  const items = (issues || []) as any[];
  const total = items.length;
  const todo = items.filter((i: any) => i.status_category === 'To Do').length;
  const inProgress = items.filter((i: any) => i.status_category === 'In Progress').length;
  const done = items.filter((i: any) => i.status_category === 'Done').length;

  const result = {
    total_items: total,
    todo_count: todo,
    in_progress_count: inProgress,
    done_count: done,
  };

  setCache(cacheKey, result);
  return result;
};

// ── Work Items — sourced from ph_issues via jira_account_id ──
export const fetchWorkItems = async (resourceId: string, jiraAccountId?: string | null) => {
  if (!jiraAccountId) {
    // Fallback to old view
    const { data, error } = await supabase
      .from('r360_work_items_enriched_view' as any)
      .select('*')
      .eq('resource_id', resourceId)
      .order('assigned_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as any[];
  }

  const cacheKey = `workitems:${jiraAccountId}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('ph_issues' as any)
    .select('issue_key, project_key, project_name, issue_type, summary, status, status_category, priority, parent_key, parent_summary, due_date, effective_due_date, story_points, sprint_name, fix_versions, labels, components, type_icon_url, jira_created_at, jira_updated_at')
    .eq('assignee_account_id', jiraAccountId)
    .order('jira_updated_at', { ascending: false });
  if (error) throw error;

  const items = (data ?? []).map((i: any) => {
    // Extract fix version names as release names
    const fvList = Array.isArray(i.fix_versions) ? i.fix_versions : [];
    const releaseNames = fvList.map((fv: any) => fv?.name).filter(Boolean);

    return {
      id: i.issue_key,
      issue_key: i.issue_key,
      project_key: i.project_key,
      project_name: i.project_name || i.project_key,
      item_type: i.issue_type,
      title: i.summary,
      status: i.status,
      status_category: i.status_category,
      priority: i.priority,
      parent_key: i.parent_key,
      parent_summary: i.parent_summary,
      due_date: i.effective_due_date || i.due_date,
      story_points: i.story_points,
      sprint_name: i.sprint_name,
      fix_versions: i.fix_versions,
      release_names: releaseNames,
      labels: i.labels,
      components: i.components,
      type_icon_url: i.type_icon_url,
      assigned_date: i.jira_created_at,
      updated_at: i.jira_updated_at,
      hub: 'ProjectHub',
    };
  });

  setCache(cacheKey, items);
  return items;
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
