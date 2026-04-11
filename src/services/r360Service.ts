import { supabase, typedQuery, typedQuery } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';
import { isContributorRole } from '@/constants/r360RoleClassification';
import type { R360WorkItem } from '@/types/r360';

function mapStatus(jiraStatus: string) {
  return R360_STATUS_MAP[jiraStatus] || R360_STATUS_DEFAULT;
}

function computeAge(fromDate: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(fromDate).getTime()) / 86400000));
  return { age_days: days, age_class: (days <= 7 ? 'green' : days <= 14 ? 'amber' : 'red') as R360WorkItem['age_class'] };
}

function groupDate(dateStr: string) {
  const d = new Date(dateStr);
  const gd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today = new Date();
  const tStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const y = new Date(today); y.setDate(y.getDate()-1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let label = gd===tStr ? `Today, ${M[d.getMonth()]} ${d.getDate()}` : gd===yStr ? `Yesterday, ${M[d.getMonth()]} ${d.getDate()}` : `${D[d.getDay()]}, ${M[d.getMonth()]} ${d.getDate()}`;
  return { group_date: gd, date_label: label };
}

/** Compute carry-over label from assignment date relative to a period */
function computeCarriedFromLabel(assignedAt: string, periodStart: Date): string | null {
  const ad = new Date(assignedAt);
  if (ad >= periodStart) return null; // assigned in current period — no carry-over
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Get ISO week number
  const d = new Date(ad);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `From W${weekNum}, ${M[ad.getMonth()]}`;
}

/**
 * Fetch the most recent assignment date for each issue_key assigned to a specific person.
 * Uses jira_sync_changelog where field_name = 'assignee' and to_string matches the resource name (case-insensitive).
 * Falls back to jira_created_at if no changelog entry exists.
 */
async function fetchAssignmentDates(issueKeys: string[], resourceName: string, jiraAccountId?: string): Promise<Record<string, string>> {
  if (!issueKeys.length) return {};
  
  // Fetch assignee changelog entries for these issues
  const { data, error } = await typedQuery('jira_sync_changelog')
    .select('issue_key, to_string, to_value, jira_created_at')
    .in('issue_key', issueKeys)
    .eq('field_name', 'assignee')
    .order('jira_created_at', { ascending: false });
  
  if (error) {
    console.error('[R360] Failed to fetch assignment dates:', error.message);
    return {};
  }

  const result: Record<string, string> = {};
  const nameLower = resourceName.toLowerCase();
  
  for (const entry of (data || [])) {
    const key = entry.issue_key;
    if (result[key]) continue; // already found the most recent assignment
    
    // Match by account_id first, then by name
    const matchesAccount = jiraAccountId && entry.to_value === jiraAccountId;
    const matchesName = entry.to_string && entry.to_string.toLowerCase() === nameLower;
    
    if (matchesAccount || matchesName) {
      result[key] = entry.jira_created_at;
    }
  }
  
  return result;
}

export const r360Service = {
  async getResources() {
    const { data, error } = await typedQuery('resource_inventory')
      .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id, is_active')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      rid: r.rid || '',
      profile_id: r.profile_id,
      name: r.name,
      role_name: r.role_name || 'Team Member',
      department: r.department_name || '',
      vendor: r.vendor_name,
      resource_type: r.resource_type,
      is_active: r.is_active,
    }));
  },

  async getMemberOverview(resourceId: string) {
    const { data: resource } = await typedQuery('resource_inventory')
      .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id, jira_account_id')
      .eq('id', resourceId)
      .single();
    if (!resource) return null;

    let avatar_url: string | null = null;
    if (resource.profile_id) {
      const { data: profile } = await typedQuery('profiles')
        .select('avatar_url')
        .eq('id', resource.profile_id)
        .maybeSingle();
      avatar_url = profile?.avatar_url ?? null;
    }

    // Count assigned work items — prefer jira_account_id for accurate matching
    let overviewAssigneeQuery = typedQuery('ph_issues')
      .select('issue_key, status, jira_created_at');
    if (resource.jira_account_id) {
      overviewAssigneeQuery = overviewAssigneeQuery.eq('assignee_account_id', resource.jira_account_id);
    } else {
      overviewAssigneeQuery = overviewAssigneeQuery.eq('assignee_display_name', resource.name);
    }
    const { data: assignedItems } = await overviewAssigneeQuery;

    // Fetch assignment dates for age calculation
    const issueKeys = (assignedItems || []).map((i: any) => i.issue_key);
    const assignmentDates = await fetchAssignmentDates(issueKeys, resource.name, resource.jira_account_id);

    // Count contributed items for non-developer roles
    let contributedItems: any[] = [];
    if (isContributorRole(resource.role_name || '')) {
      let contribQuery = typedQuery('ph_issues')
        .select('issue_key, status, jira_created_at, assignee_account_id, reporter_account_id');
      if (resource.jira_account_id) {
        contribQuery = contribQuery.eq('reporter_account_id', resource.jira_account_id);
      } else {
        contribQuery = contribQuery.ilike('reporter_display_name', `%${resource.name}%`);
      }
      const { data: cItems } = await contribQuery;
      contributedItems = (cItems || []).filter((i: any) =>
        resource.jira_account_id
          ? i.assignee_account_id !== resource.jira_account_id
          : true
      );
    }

    const all = [...(assignedItems || []), ...contributedItems];
    const open = all.filter((i: any) => {
      const st = mapStatus(i.status);
      return st.category !== 'done';
    }).length;
    const stale = all.filter((i: any) => {
      const st = mapStatus(i.status);
      if (st.category === 'done') return false;
      // Use assignment date for stale calculation
      const ageFrom = assignmentDates[i.issue_key] || i.jira_created_at;
      const age = computeAge(ageFrom);
      return age.age_days > 14;
    }).length;

    return {
      ...resource,
      name: resource.name,
      role_name: resource.role_name || 'Team Member',
      department: resource.department_name || '',
      avatar_url,
      total_items: all.length,
      open_items: open,
      stale_items: stale,
      done_items: all.length - open,
    };
  },

  async getMemberWorkItems(resourceId: string, filters?: any): Promise<R360WorkItem[]> {
    const { data: resource } = await typedQuery('resource_inventory')
      .select('name, role_name, jira_account_id')
      .eq('id', resourceId)
      .single();
    if (!resource) return [];

    const ISSUE_FIELDS = 'issue_key, project_key, project_name, summary, issue_type, status, priority, assignee_display_name, reporter_display_name, parent_key, parent_summary, sprint_name, story_points, fix_versions, due_date, jira_created_at, jira_updated_at, resolution, labels, assignee_account_id, reporter_account_id';

    // Fetch assigned items — prefer jira_account_id for accurate matching
    let assigneeQuery = typedQuery('ph_issues')
      .select(ISSUE_FIELDS);
    if (resource.jira_account_id) {
      assigneeQuery = assigneeQuery.eq('assignee_account_id', resource.jira_account_id);
    } else {
      assigneeQuery = assigneeQuery.eq('assignee_display_name', resource.name);
    }
    if (filters?.search) assigneeQuery = assigneeQuery.ilike('summary', `%${filters.search}%`);
    if (filters?.project_keys?.length) assigneeQuery = assigneeQuery.in('project_key', filters.project_keys);
    if (filters?.item_types?.length) assigneeQuery = assigneeQuery.in('issue_type', filters.item_types);
    assigneeQuery = assigneeQuery.order('jira_updated_at', { ascending: false });

    const { data: assignedData, error: assignedError } = await assigneeQuery;
    if (assignedError) throw assignedError;

    // Fetch assignment dates from changelog
    const assignedKeys = (assignedData || []).map((i: any) => i.issue_key);
    const assignmentDates = await fetchAssignmentDates(assignedKeys, resource.name, resource.jira_account_id);

    // Fetch contributor items (reported-by) for non-developer roles
    let contributedData: any[] = [];
    if (isContributorRole(resource.role_name || '')) {
      let contribQuery = typedQuery('ph_issues')
        .select(ISSUE_FIELDS);
      if (resource.jira_account_id) {
        contribQuery = contribQuery.eq('reporter_account_id', resource.jira_account_id);
      } else {
        contribQuery = contribQuery.ilike('reporter_display_name', `%${resource.name}%`);
      }
      if (filters?.search) contribQuery = contribQuery.ilike('summary', `%${filters.search}%`);
      if (filters?.project_keys?.length) contribQuery = contribQuery.in('project_key', filters.project_keys);
      if (filters?.item_types?.length) contribQuery = contribQuery.in('issue_type', filters.item_types);
      contribQuery = contribQuery.order('jira_updated_at', { ascending: false });

      const { data: cData, error: cError } = await contribQuery;
      if (cError) throw cError;
      contributedData = (cData || []).filter((i: any) =>
        resource.jira_account_id
          ? i.assignee_account_id !== resource.jira_account_id
          : i.assignee_display_name !== resource.name
      );
    }

    const mapItem = (item: any, roleOnItem: 'Assignee' | 'Contributor'): R360WorkItem => {
      const st = mapStatus(item.status);
      // Use assignment date for age, fall back to jira_created_at
      const assignedAt = assignmentDates[item.issue_key] || item.jira_created_at;
      const age = computeAge(assignedAt);
      const gd = groupDate(item.jira_updated_at || item.jira_created_at);
      let fv: string | null = null;
      if (item.fix_versions) {
        try {
          const fvArr = typeof item.fix_versions === 'string' ? JSON.parse(item.fix_versions) : item.fix_versions;
          if (Array.isArray(fvArr) && fvArr.length > 0) fv = fvArr[0]?.name || fvArr[0] || null;
        } catch { /* ignore */ }
      }
      return {
        id: item.issue_key,
        item_key: item.issue_key,
        title: item.summary || '',
        item_type: item.issue_type || 'Task',
        priority: item.priority || 'Medium',
        status: item.status || '',
        status_category: st.category,
        status_label: st.label,
        status_color: st.color,
        status_bg: st.bg,
        status_dot: st.dot,
        project_key: item.project_key || '',
        project_name: item.project_name || '',
        assignee_name: item.assignee_display_name || '',
        reporter_name: item.reporter_display_name || '',
        parent_key: item.parent_key,
        parent_title: item.parent_summary,
        sprint_name: item.sprint_name,
        story_points: item.story_points,
        fix_version: fv,
        due_date: item.due_date,
        created_at: item.jira_created_at,
        updated_at: item.jira_updated_at || item.jira_created_at,
        resolved_at: item.resolution ? item.jira_updated_at : null,
        labels: item.labels || [],
        assigned_at: assignedAt,
        carried_from_label: null, // computed at the view layer based on period context
        role_on_item: roleOnItem,
        ...age,
        ...gd,
      } as R360WorkItem;
    };

    const assignedItems = (assignedData || []).map((item: any) => mapItem(item, 'Assignee'));
    const contributedItems = contributedData.map((item: any) => mapItem(item, 'Contributor'));

    // Deduplicate by issue_key (assigned takes priority)
    const seen = new Set(assignedItems.map((i: R360WorkItem) => i.item_key));
    const uniqueContributed = contributedItems.filter((i: R360WorkItem) => !seen.has(i.item_key));

    return [...assignedItems, ...uniqueContributed].filter((item: R360WorkItem) => {
      if (filters?.pending_only && item.status_category === 'done') return false;
      if (filters?.status_categories?.length) return filters.status_categories.includes(item.status_category);
      return true;
    });
  },

  async getSiblings(parentKey: string) {
    // Only show siblings when the parent is a Story (not Epics or other types)
    const { data: parentData } = await typedQuery('ph_issues')
      .select('issue_type')
      .eq('issue_key', parentKey)
      .limit(1)
      .single();
    const parentType = (parentData as any)?.issue_type || '';
    if (!parentType.toLowerCase().includes('story')) {
      return [];
    }

    const { data, error } = await typedQuery('ph_issues')
      .select('issue_key, summary, status, assignee_display_name, jira_created_at')
      .eq('parent_key', parentKey)
      .order('issue_key');
    if (error) throw error;
    return (data || []).map((item: any) => {
      const st = mapStatus(item.status);
      const age = computeAge(item.jira_created_at);
      return {
        id: item.issue_key,
        item_key: item.issue_key,
        title: item.summary || '',
        status_label: st.label,
        status_color: st.color,
        status_bg: st.bg,
        status_dot: st.dot,
        status_category: st.category,
        assignee_name: item.assignee_display_name || '',
        ...age,
      };
    });
  },
};

export { computeCarriedFromLabel };
