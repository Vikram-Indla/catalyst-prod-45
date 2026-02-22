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
    .select('issue_key, project_key, project_name, issue_type, summary, status, status_category, priority, parent_key, parent_summary, due_date, effective_due_date, story_points, sprint_name, fix_versions, labels, components, type_icon_url, jira_created_at, jira_updated_at, assignee_display_name, reporter_display_name')
    .eq('assignee_account_id', jiraAccountId)
    .order('jira_updated_at', { ascending: false });
  if (error) throw error;

  const items = (data ?? []).map((i: any) => {
    // Extract fix version names as release names
    const fvList = Array.isArray(i.fix_versions) ? i.fix_versions : [];
    const releaseNames = fvList.map((fv: any) => fv?.name).filter(Boolean);

    // Get the latest fix version with a releaseDate for due date
    const fvWithDate = fvList.filter((fv: any) => fv?.releaseDate).sort((a: any, b: any) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
    const latestFv = fvWithDate[0];
    const releaseDueDate = latestFv?.releaseDate || null;
    const releaseKey = releaseNames.join(', ') || null;

    // Compute days_until_due from fix version releaseDate
    const dueDateStr = releaseDueDate || i.effective_due_date || i.due_date;
    let daysUntilDue: number | null = null;
    if (dueDateStr) {
      const diff = new Date(dueDateStr).getTime() - Date.now();
      daysUntilDue = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      id: i.issue_key,
      item_key: i.issue_key,
      issue_key: i.issue_key,
      project_key: i.project_key,
      project_name: i.project_name || i.project_key,
      work_item_type: i.issue_type,
      item_type: i.issue_type,
      title: i.summary,
      status: i.status,
      status_category: i.status_category,
      priority: i.priority,
      parent_key: i.parent_key,
      parent_item_key: i.parent_key,
      parent_summary: i.parent_summary,
      due_date: dueDateStr,
      days_until_due: daysUntilDue,
      story_points: i.story_points,
      sprint_name: i.sprint_name,
      fix_versions: i.fix_versions,
      release_names: releaseNames,
      release_key: releaseKey,
      release_end_date: releaseDueDate,
      labels: i.labels,
      components: i.components,
      type_icon_url: i.type_icon_url,
      assigned_date: i.jira_created_at,
      reporter_name: i.reporter_display_name || i.assignee_display_name || null,
      updated_at: i.jira_updated_at,
      source_hub: 'ProjectHub',
      hub: 'ProjectHub',
    };
  });

  setCache(cacheKey, items);
  return items;
};

// ── Releases from all projects this resource works on (from fix_versions in ph_issues) ──
export const fetchProjectReleases = async (jiraAccountId?: string | null): Promise<string[]> => {
  if (!jiraAccountId) return [];

  const cacheKey = `releases:${jiraAccountId}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  // 1. Get distinct project keys for this resource
  const { data: projectRows } = await supabase
    .from('ph_issues' as any)
    .select('project_key')
    .eq('assignee_account_id', jiraAccountId);

  const projectKeys = [...new Set((projectRows ?? []).map((r: any) => r.project_key).filter(Boolean))];
  if (!projectKeys.length) return [];

  // 2. Get all issues with fix_versions in those projects
  const { data: fvRows } = await supabase
    .from('ph_issues' as any)
    .select('fix_versions')
    .in('project_key', projectKeys)
    .not('fix_versions', 'is', null);

  const releaseSet = new Set<string>();
  (fvRows ?? []).forEach((row: any) => {
    const fvList = Array.isArray(row.fix_versions) ? row.fix_versions : [];
    fvList.forEach((fv: any) => {
      if (fv?.name) releaseSet.add(fv.name);
    });
  });

  const result = Array.from(releaseSet).sort();
  setCache(cacheKey, result);
  return result;
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
