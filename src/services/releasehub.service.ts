import { supabase } from '@/integrations/supabase/client';

// ── RELEASES ──────────────────────────────────────────────────────
export const releaseService = {
  getAll: async (projectId?: string) => {
    let q = supabase.from('rh_release_summary').select('*').order('target_date', { ascending: true });
    if (projectId) q = q.eq('project_id', projectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as any[]) || [];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('rh_release_summary').select('*').eq('id', id).single();
    if (error) throw error;
    return data as any;
  },

  create: async (payload: { name: string; target_date: string; version?: string; status?: string; source?: string; jira_key?: string; project_id?: string }) => {
    const { data, error } = await supabase.from('rh_releases').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  updateStatus: async (id: string, status: string) => {
    const { error } = await supabase.from('rh_releases').update({ status }).eq('id', id);
    if (error) throw error;
  },

  getTestCycles: async (releaseId: string) => {
    const { data, error } = await supabase
      .from('rh_release_test_cycle_links')
      .select('*, tm_test_cycles(*)')
      .eq('release_id', releaseId);
    if (error) throw error;
    return data || [];
  },

  linkTestCycle: async (releaseId: string, testCycleId: string) => {
    const { error } = await supabase.from('rh_release_test_cycle_links').insert({ release_id: releaseId, test_cycle_id: testCycleId });
    if (error) throw error;
  },
};

// ── CHANGES ───────────────────────────────────────────────────────
export const changeService = {
  getAll: async (projectId?: string) => {
    let q = supabase.from('rh_change_summary').select('*, rh_change_work_items(*)').order('deployment_date', { ascending: true, nullsFirst: false });
    if (projectId) q = q.eq('project_id', projectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as any[]) || [];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('rh_changes')
      .select('*, rh_change_work_items(*), rh_change_signoffs(*), rh_change_status_history(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as any;
  },

  getWorkItems: async (changeId: string) => {
    const { data, error } = await supabase.from('rh_change_work_items').select('*').eq('change_id', changeId);
    if (error) throw error;
    return data || [];
  },

  create: async (payload: { chg_number: string; title: string; status?: string; risk_level?: string; source?: string; category?: string; deployment_date?: string }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const insertPayload = { ...payload, created_by: userId ?? undefined };
    const { data, error } = await supabase.from('rh_changes').insert(insertPayload).select().single();
    if (error) throw error;
    if (data) {
      await supabase.from('rh_change_status_history').insert({
        change_id: data.id, to_status: data.status, changed_by: userId ?? undefined
      });
    }
    return data;
  },

  updateStatus: async (id: string, status: string, comment?: string) => {
    const { data: current } = await supabase.from('rh_changes').select('status').eq('id', id).single();
    const { error } = await supabase.from('rh_changes').update({ status }).eq('id', id);
    if (error) throw error;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('rh_change_status_history').insert({
      change_id: id, from_status: current?.status ?? undefined, to_status: status, changed_by: userId ?? undefined, comment: comment ?? undefined
    });
  },

  linkWorkItem: async (changeId: string, workItem: { work_item_key: string; work_item_title: string; work_item_type?: string; work_item_status?: string; work_item_id?: string }) => {
    const { error } = await supabase.from('rh_change_work_items').insert({ change_id: changeId, ...workItem });
    if (error) throw error;
  },

  approveSignoff: async (signoffId: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('rh_change_signoffs').update({
      status: 'approved', actioned_at: new Date().toISOString(), actioned_by: userId ?? undefined
    }).eq('id', signoffId);
    if (error) throw error;
  },

  rejectSignoff: async (signoffId: string, comment: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('rh_change_signoffs').update({
      status: 'rejected', actioned_at: new Date().toISOString(), actioned_by: userId ?? undefined, comment
    }).eq('id', signoffId);
    if (error) throw error;
  },
};

// ── COMMAND CENTER ─────────────────────────────────────────────────
export const commandCenterService = {
  getMappings: async () => {
    const { data, error } = await supabase
      .from('rh_release_test_cycle_links')
      .select('release_id, tm_test_cycles(*)')
      .order('linked_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
