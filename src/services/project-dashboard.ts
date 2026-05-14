/**
 * ProjectHub Dashboard V3 — Supabase Service Layer
 * All queries return real data from ph_* tables and views.
 */
import { supabase } from '@/integrations/supabase/client';

// ─── Helper: resolve project UUID from key ───
export async function resolveProjectId(projectKey: string): Promise<string | null> {
  const { data } = await supabase
    .from('ph_projects')
    .select('id')
    .eq('key', projectKey.toUpperCase())
    .maybeSingle();
  return data?.id ?? null;
}

// ─── Releases ───
export async function fetchReleases(projectId: string) {
  const { data, error } = await supabase
    .from('ph_releases')
    .select('id, name, title, status, target_date, project_id, start_date')
    .eq('project_id', projectId)
    .in('status', ['in_progress', 'active', 'released'])
    .order('target_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Milestone Config ───
export async function fetchMilestoneConfig(projectId: string) {
  const { data, error } = await supabase
    .from('ph_milestone_config')
    .select('id, project_id, statuses, updated_by, updated_at')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMilestoneConfig(projectId: string, statuses: string[]) {
  const { error } = await supabase
    .from('ph_milestone_config')
    .upsert({ project_id: projectId, statuses, updated_at: new Date().toISOString() } as any, { onConflict: 'project_id' });
  if (error) throw error;
}

// ─── Key Milestones ───
export async function fetchKeyMilestones(projectId: string, releaseIds: string[]) {
  const config = await fetchMilestoneConfig(projectId);
  const milestoneStatuses = config?.statuses ?? ['ready_for_development', 'beta_ready', 'production_ready'];

  const { data, error } = await supabase
    .from('ph_work_items')
    .select('id, item_key, title, summary, item_type, status, due_date, release_id, assignee_id, updated_at')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .in('status', milestoneStatuses)
    .order('status');
  if (error) throw error;

  const itemIds = (data ?? []).map(d => d.id);
  // Fetch last transition to current status for each item
  const transitionMap: Record<string, string> = {};
  if (itemIds.length > 0) {
    const { data: transitions } = await supabase
      .from('ph_status_transitions')
      .select('work_item_id, to_status, changed_at')
      .in('work_item_id', itemIds)
      .order('changed_at', { ascending: false });
    const seen = new Set<string>();
    for (const t of transitions ?? []) {
      const item = (data ?? []).find(d => d.id === t.work_item_id);
      if (item && t.to_status === item.status && !seen.has(t.work_item_id)) {
        seen.add(t.work_item_id);
        transitionMap[t.work_item_id] = t.changed_at;
      }
    }
  }

  const assigneeIds = [...new Set((data ?? []).map(d => d.assignee_id).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(assigneeIds);

  return (data ?? []).map(d => {
    const statusDate = transitionMap[d.id] ?? d.updated_at;
    const daysInStatus = statusDate ? Math.floor((Date.now() - new Date(statusDate).getTime()) / 86400000) : 0;
    return {
      ...d,
      displayTitle: d.title || d.summary,
      assignee_name: profiles[d.assignee_id ?? ''] ?? null,
      status_date: statusDate,
      days_in_status: daysInStatus,
    };
  });
}

// ─── Latest in Production ───
export async function fetchInProduction(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('id, item_key, title, summary, item_type, status, release_id, assignee_id, updated_at')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .eq('status', 'in_production')
    .order('updated_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  const itemIds = (data ?? []).map(d => d.id);
  // Fetch transition to in_production for accurate "since" date
  const deployDateMap: Record<string, string> = {};
  if (itemIds.length > 0) {
    const { data: transitions } = await supabase
      .from('ph_status_transitions')
      .select('work_item_id, changed_at')
      .in('work_item_id', itemIds)
      .eq('to_status', 'in_production')
      .order('changed_at', { ascending: false });
    const seen = new Set<string>();
    for (const t of transitions ?? []) {
      if (!seen.has(t.work_item_id)) {
        seen.add(t.work_item_id);
        deployDateMap[t.work_item_id] = t.changed_at;
      }
    }
  }

  const assigneeIds = [...new Set((data ?? []).map(d => d.assignee_id).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(assigneeIds);

  return (data ?? []).map(d => ({
    ...d,
    displayTitle: d.title || d.summary,
    assignee_name: profiles[d.assignee_id ?? ''] ?? null,
    deploy_date: deployDateMap[d.id] ?? d.updated_at,
  }));
}

// ─── Items by Status ───
export async function fetchItemsByStatus(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('status, release_id')
    .eq('project_id', projectId)
    .in('release_id', releaseIds);
  if (error) throw error;

  // Aggregate
  const map: Record<string, { status: string; release_id: string; item_count: number }> = {};
  for (const row of data ?? []) {
    const k = `${row.status}__${row.release_id}`;
    if (!map[k]) map[k] = { status: row.status, release_id: row.release_id!, item_count: 0 };
    map[k].item_count++;
  }
  return Object.values(map);
}

// ─── Overdue ───
export async function fetchOverdue(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('id, item_key, title, summary, item_type, status, due_date, release_id, assignee_id')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .not('due_date', 'is', null)
    .lt('due_date', new Date().toISOString().split('T')[0])
    .not('status', 'in', '("Done","in_production","Cancelled")');
  if (error) throw error;

  const assigneeIds = [...new Set((data ?? []).map(d => d.assignee_id).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(assigneeIds);

  return (data ?? []).map(d => ({
    ...d,
    displayTitle: d.title || d.summary,
    assignee_name: profiles[d.assignee_id ?? ''] ?? null,
    days_overdue: d.due_date ? Math.ceil((Date.now() - new Date(d.due_date).getTime()) / 86400000) : 0,
  }));
}

// ─── On Hold ───
export async function fetchOnHold(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('id, item_key, title, summary, item_type, status, release_id, assignee_id, on_hold_reason')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .eq('status', 'on_hold');
  if (error) throw error;

  const itemIds = (data ?? []).map(d => d.id);
  // Fetch the last transition to on_hold for each item to compute days
  const daysMap: Record<string, number> = {};
  if (itemIds.length > 0) {
    const { data: transitions } = await supabase
      .from('ph_status_transitions')
      .select('work_item_id, changed_at')
      .in('work_item_id', itemIds)
      .eq('to_status', 'on_hold')
      .order('changed_at', { ascending: false });
    const seen = new Set<string>();
    for (const t of transitions ?? []) {
      if (!seen.has(t.work_item_id)) {
        seen.add(t.work_item_id);
        daysMap[t.work_item_id] = Math.ceil((Date.now() - new Date(t.changed_at).getTime()) / 86400000);
      }
    }
  }

  const assigneeIds = [...new Set((data ?? []).map(d => d.assignee_id).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(assigneeIds);

  return (data ?? []).map(d => ({
    ...d,
    displayTitle: d.title || d.summary,
    assignee_name: profiles[d.assignee_id ?? ''] ?? null,
    days_on_hold: daysMap[d.id] ?? 0,
  }));
}

// ─── Incidents ───
export async function fetchIncidents(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_incidents')
    .select('id, key, title, priority, status, release_id, project_id, reported_by, assigned_to, created_at')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const userIds = [...new Set((data ?? []).flatMap(d => [d.reported_by, d.assigned_to]).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(userIds);

  return (data ?? []).map(d => ({
    ...d,
    reported_by_name: profiles[d.reported_by ?? ''] ?? null,
    assigned_to_name: profiles[d.assigned_to ?? ''] ?? null,
    days_open: Math.ceil((Date.now() - new Date(d.created_at).getTime()) / 86400000),
  }));
}

// ─── Defects ───
export async function fetchDefects(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_defects')
    .select('id, key, title, severity, status, release_id, project_id, reported_by, assigned_to, created_at')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const userIds = [...new Set((data ?? []).flatMap(d => [d.reported_by, d.assigned_to]).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(userIds);

  return (data ?? []).map(d => ({
    ...d,
    reported_by_name: profiles[d.reported_by ?? ''] ?? null,
    assigned_to_name: profiles[d.assigned_to ?? ''] ?? null,
    days_open: Math.ceil((Date.now() - new Date(d.created_at).getTime()) / 86400000),
  }));
}

// ─── Time in Status ───
export async function fetchTimeInStatus(projectId: string, releaseIds: string[]) {
  // Query transitions joined with work items
  const { data: transitions, error } = await supabase
    .from('ph_status_transitions')
    .select('id, work_item_id, from_status, to_status, changed_by, changed_at')
    .order('changed_at');
  if (error) throw error;

  // Get work items for these releases
  const { data: items } = await supabase
    .from('ph_work_items')
    .select('id, item_key, item_type, title, summary, status, release_id')
    .eq('project_id', projectId)
    .in('release_id', releaseIds);

  const itemMap = new Map((items ?? []).map(i => [i.id, i]));
  const changerIds = [...new Set((transitions ?? []).map(t => t.changed_by).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(changerIds);

  // Filter transitions to relevant items and group
  const grouped: Record<string, any> = {};
  for (const t of transitions ?? []) {
    const item = itemMap.get(t.work_item_id);
    if (!item) continue;

    if (!grouped[t.work_item_id]) {
      grouped[t.work_item_id] = {
        work_item_id: t.work_item_id,
        work_item_key: item.item_key,
        work_item_type: item.item_type,
        work_item_title: item.title || item.summary,
        current_status: item.status,
        release_key: item.release_id,
        statuses: [],
        total_cycle_days: 0,
      };
    }
    grouped[t.work_item_id].statuses.push({
      status: t.to_status,
      entered_at: t.changed_at,
      duration_days: 0, // computed below
      changed_by: profiles[t.changed_by ?? ''] ?? 'System',
    });
  }

  // Compute durations
  for (const g of Object.values(grouped)) {
    for (let i = 0; i < g.statuses.length; i++) {
      const next = g.statuses[i + 1];
      const start = new Date(g.statuses[i].entered_at).getTime();
      const end = next ? new Date(next.entered_at).getTime() : Date.now();
      g.statuses[i].duration_days = Number(((end - start) / 86400000).toFixed(1));
      g.total_cycle_days += g.statuses[i].duration_days;
    }
    g.total_cycle_days = Number(g.total_cycle_days.toFixed(1));
  }

  return Object.values(grouped);
}

// ─── Lifecycle for single work item ───
export async function fetchLifecycle(workItemId: string) {
  const { data, error } = await supabase
    .from('ph_status_transitions')
    .select('id, work_item_id, from_status, to_status, changed_by, changed_at')
    .eq('work_item_id', workItemId)
    .order('changed_at');
  if (error) throw error;

  const changerIds = [...new Set((data ?? []).map(t => t.changed_by).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(changerIds);

  return (data ?? []).map(d => ({
    ...d,
    changed_by_name: profiles[d.changed_by ?? ''] ?? 'System',
  }));
}

// ─── Team Workload ───
export async function fetchTeamWorkload(projectId: string) {
  // Direct aggregation from ph_work_items
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('assignee_id, item_type, status')
    .eq('project_id', projectId)
    .not('assignee_id', 'is', null)
    .not('status', 'in', '("Done","in_production","Cancelled")');
  if (error) throw error;

  const byUser: Record<string, { total: number; story: number; subtask: number; bug: number; incident: number }> = {};
  for (const row of data ?? []) {
    const uid = row.assignee_id!;
    if (!byUser[uid]) byUser[uid] = { total: 0, story: 0, subtask: 0, bug: 0, incident: 0 };
    byUser[uid].total++;
    const t = row.item_type?.toLowerCase() ?? '';
    if (t === 'story' || t === 'feature') byUser[uid].story++;
    else if (t === 'subtask' || t === 'task') byUser[uid].subtask++;
    else if (t === 'bug') byUser[uid].bug++;
    else if (t === 'incident') byUser[uid].incident++;
  }

  const profiles = await fetchProfileNames(Object.keys(byUser));

  return Object.entries(byUser).map(([uid, counts]) => {
    const name = profiles[uid] ?? 'Unknown';
    return {
      user_id: uid,
      name,
      initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      avatar_color: colorFromName(name),
      total_count: counts.total,
      story_count: counts.story,
      subtask_count: counts.subtask,
      bug_count: counts.bug,
      incident_count: counts.incident,
    };
  }).sort((a, b) => b.total_count - a.total_count);
}

// ─── Assigned Items (drawer) ───
export async function fetchAssignedItems(userId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_work_items')
    .select('id, item_key, title, summary, item_type, status, release_id, parent_id, assigned_at, assigned_by')
    .eq('assignee_id', userId)
    .in('release_id', releaseIds)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const items = (data ?? []).map(d => ({
    ...d,
    displayTitle: d.title || d.summary,
  }));

  // Fetch parent info for items with parent_id
  const parentIds = [...new Set(items.map(i => (i as any).parent_id).filter(Boolean))] as string[];
  const parentMap: Record<string, { item_key: string; title: string; item_type: string }> = {};
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from('ph_work_items')
      .select('id, item_key, title, summary, item_type')
      .in('id', parentIds);
    for (const p of parents ?? []) {
      parentMap[p.id] = { item_key: p.item_key, title: p.title || p.summary || '', item_type: p.item_type };
    }
  }

  // Fetch siblings (same parent, different item) and their assignee names
  const siblingsByParent: Record<string, any[]> = {};
  if (parentIds.length > 0) {
    const { data: siblings } = await supabase
      .from('ph_work_items')
      .select('id, item_key, title, summary, item_type, status, parent_id, assignee_id')
      .in('parent_id', parentIds);
    
    const sibAssigneeIds = [...new Set((siblings ?? []).map(s => s.assignee_id).filter(Boolean))] as string[];
    const sibProfiles = await fetchProfileNames(sibAssigneeIds);

    for (const s of siblings ?? []) {
      if (!siblingsByParent[s.parent_id!]) siblingsByParent[s.parent_id!] = [];
      siblingsByParent[s.parent_id!].push({
        ...s,
        displayTitle: s.title || s.summary,
        assignee_name: sibProfiles[s.assignee_id ?? ''] ?? null,
      });
    }
  }

  // Fetch assigned_by profile names
  const assignedByIds = [...new Set(items.map(i => (i as any).assigned_by).filter(Boolean))] as string[];
  const assignedByProfiles = await fetchProfileNames(assignedByIds);

  return items.map(item => ({
    ...item,
    parent: parentMap[(item as any).parent_id] ?? null,
    siblings: (item as any).parent_id ? (siblingsByParent[(item as any).parent_id] ?? []).filter((s: any) => s.id !== item.id) : [],
    assigned_by_name: assignedByProfiles[(item as any).assigned_by ?? ''] ?? null,
  }));
}

// ─── Recent Activity ───
export async function fetchActivity(projectId: string, releaseIds: string[]) {
  const { data, error } = await supabase
    .from('ph_dashboard_activity')
    .select('id, user_id, action, item_key, item_type, release_id, project_id, created_at')
    .eq('project_id', projectId)
    .in('release_id', releaseIds)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  const userIds = [...new Set((data ?? []).map(d => d.user_id).filter(Boolean))] as string[];
  const profiles = await fetchProfileNames(userIds);

  return (data ?? []).map(d => {
    const name = profiles[d.user_id ?? ''] ?? 'Unknown';
    return {
      ...d,
      user_name: name,
      user_initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      user_color: colorFromName(name),
    };
  });
}

// ─── TIS Config ───
export async function fetchTisConfig(projectId: string) {
  const { data, error } = await supabase
    .from('ph_tis_config')
    .select('id, project_id, visible_statuses, updated_by, updated_at')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Update TIS Config ───
export async function updateTisConfig(projectId: string, visibleStatuses: string[]) {
  const { error } = await supabase
    .from('ph_tis_config')
    .upsert({ project_id: projectId, visible_statuses: visibleStatuses, updated_at: new Date().toISOString() } as any, { onConflict: 'project_id' });
  if (error) throw error;
}

// ─── Helper: batch fetch profile names ───
async function fetchProfileNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);
  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    map[p.id] = p.full_name ?? 'Unknown';
  }
  return map;
}

// ─── Utility: deterministic avatar color ───
function colorFromName(name: string): string {
  const colors = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#EF4444', '#16A34A', '#0891B2', '#BE185D'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
