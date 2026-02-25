import { supabase } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';
import type { R360WorkItem } from '@/types/r360';

function mapStatus(jiraStatus: string) {
  return R360_STATUS_MAP[jiraStatus] || R360_STATUS_DEFAULT;
}

function computeAge(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
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

export const r360Service = {
  async getResources() {
    const { data, error } = await (supabase as any).from('resource_inventory')
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
    // Use vw_wh_resource_360 to get aggregated stats
    const { data: resource } = await (supabase as any).from('resource_inventory')
      .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id')
      .eq('id', resourceId)
      .single();
    if (!resource) return null;

    // Fetch avatar from profiles if profile_id exists
    let avatar_url: string | null = null;
    if (resource.profile_id) {
      const { data: profile } = await (supabase as any).from('profiles')
        .select('avatar_url')
        .eq('id', resource.profile_id)
        .maybeSingle();
      avatar_url = profile?.avatar_url ?? null;
    }

    // Count work items
    const { data: items } = await (supabase as any).from('ph_issues')
      .select('status, jira_created_at')
      .eq('assignee_display_name', resource.name);

    const all = items || [];
    const open = all.filter((i: any) => {
      const st = mapStatus(i.status);
      return st.category !== 'done';
    }).length;
    const stale = all.filter((i: any) => {
      const st = mapStatus(i.status);
      if (st.category === 'done') return false;
      const age = computeAge(i.jira_created_at);
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
    const { data: resource } = await (supabase as any).from('resource_inventory')
      .select('name')
      .eq('id', resourceId)
      .single();
    if (!resource) return [];

    let query = (supabase as any).from('ph_issues')
      .select('issue_key, project_key, project_name, summary, issue_type, status, priority, assignee_display_name, reporter_display_name, parent_key, parent_summary, sprint_name, story_points, fix_versions, due_date, jira_created_at, jira_updated_at, resolution, labels')
      .eq('assignee_display_name', resource.name);

    if (filters?.search) query = query.ilike('summary', `%${filters.search}%`);
    if (filters?.project_keys?.length) query = query.in('project_key', filters.project_keys);
    if (filters?.item_types?.length) query = query.in('issue_type', filters.item_types);
    query = query.order('jira_updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => {
      const st = mapStatus(item.status);
      const age = computeAge(item.jira_created_at);
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
        ...age,
        ...gd,
      } as R360WorkItem;
    }).filter((item: R360WorkItem) => {
      if (filters?.pending_only && item.status_category === 'done') return false;
      if (filters?.status_categories?.length) return filters.status_categories.includes(item.status_category);
      return true;
    });
  },

  async getSiblings(parentKey: string) {
    // Only show siblings when the parent is a Story (not Epics or other types)
    const { data: parentData } = await (supabase as any).from('ph_issues')
      .select('issue_type')
      .eq('issue_key', parentKey)
      .limit(1)
      .single();
    const parentType = (parentData as any)?.issue_type || '';
    if (!parentType.toLowerCase().includes('story')) {
      return [];
    }

    const { data, error } = await (supabase as any).from('ph_issues')
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
