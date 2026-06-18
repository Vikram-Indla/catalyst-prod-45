import { supabase } from '@/integrations/supabase/client';
import type { ChangeStatus, DeploymentResult, SignOffDecision } from '@/types/release-hub';

// ── RELEASES ──────────────────────────────────────────────────────
export const releaseService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('rh_releases')
      .select('*')
      .order('target_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('rh_releases')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getSummary: async () => {
    const { data, error } = await supabase
      .from('rh_release_summary')
      .select('*')
      .order('target_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  create: async (payload: {
    name: string;
    target_date: string;
    key?: string;
    description?: string;
    status?: string;
    source?: string;
    version?: string;
    project_id?: string;
    product_id?: string;
    release_type?: string;
    target_env?: string;
    planned_start_date?: string;
    planned_release_date?: string;
    release_manager_id?: string;
    product_owner_id?: string;
    qa_lead_id?: string;
    uat_lead_id?: string;
  }) => {
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
    return data ?? [];
  },

  linkTestCycle: async (releaseId: string, testCycleId: string) => {
    const { error } = await supabase.from('rh_release_test_cycle_links').insert({ release_id: releaseId, test_cycle_id: testCycleId });
    if (error) throw error;
  },
};

// ── CHANGES ───────────────────────────────────────────────────────
export const changeService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('rh_change_summary')
      .select('*, rh_change_work_items(*)')
      .order('deployment_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('rh_changes')
      .select('*, rh_change_work_items(*), rh_change_signoffs(*), rh_change_status_history(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (payload: { chg_number: string; title: string; description?: string; status?: string; risk_level?: string; source?: string; category?: string; deployment_date?: string; planned_date?: string }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase.from('rh_changes').insert({ ...payload, created_by: userId ?? undefined }).select().single();
    if (error) throw error;
    if (data) {
      await supabase.from('rh_change_status_history').insert({
        change_id: data.id, to_status: data.status, changed_by: userId ?? undefined,
      });
    }
    return data;
  },

  updateStatus: async (id: string, status: string, deploymentResult?: string | null, comment?: string) => {
    const { data: current } = await supabase.from('rh_changes').select('status').eq('id', id).single();
    const updatePayload: Record<string, any> = { status };
    if (deploymentResult !== undefined) updatePayload.deployment_result = deploymentResult;
    const { error } = await supabase.from('rh_changes').update(updatePayload).eq('id', id);
    if (error) throw error;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('rh_change_status_history').insert({
      change_id: id, from_status: current?.status ?? undefined, to_status: status, changed_by: userId ?? undefined, comment: comment ?? undefined,
    });
  },

  // Work items
  getWorkItems: async (changeId: string) => {
    const { data, error } = await supabase.from('rh_change_work_items').select('*').eq('change_id', changeId);
    if (error) throw error;
    return data ?? [];
  },

  linkWorkItem: async (changeId: string, workItem: { work_item_key: string; work_item_title: string; work_item_type?: string; work_item_status?: string; work_item_id?: string }) => {
    const { error } = await supabase.from('rh_change_work_items').insert({ change_id: changeId, ...workItem });
    if (error) throw error;
  },

  // Sign-offs
  approveSignoff: async (signoffId: string, comment?: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('rh_change_signoffs').update({
      status: 'approved', actioned_at: new Date().toISOString(), actioned_by: userId ?? undefined, comment: comment ?? undefined,
    }).eq('id', signoffId);
    if (error) throw error;
  },

  rejectSignoff: async (signoffId: string, comment: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from('rh_change_signoffs').update({
      status: 'rejected', actioned_at: new Date().toISOString(), actioned_by: userId ?? undefined, comment,
    }).eq('id', signoffId);
    if (error) throw error;
  },
};

// ── SIGN-OFFS ─────────────────────────────────────────────────────
export const signOffService = {
  getByChangeId: async (changeId: string) => {
    const { data, error } = await supabase
      .from('rh_change_signoffs')
      .select('*')
      .eq('change_id', changeId)
      .order('stage', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  getAllPending: async () => {
    const { data, error } = await supabase
      .from('rh_change_signoffs')
      .select('*, rh_changes(chg_number, title, risk_level)')
      .in('status', ['pending', 'waiting'])
      .order('wait_started_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

// ── TRIAGE ────────────────────────────────────────────────────────
export const triageService = {
  getUnlinked: async () => {
    const { data, error } = await supabase
      .from('rh_changes')
      .select('*')
      .is('release_id', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  linkToRelease: async (changeId: string, releaseId: string) => {
    const { data, error } = await supabase
      .from('rh_changes')
      .update({ release_id: releaseId })
      .eq('id', changeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ── TEST CYCLES ───────────────────────────────────────────────────
export const testCycleService = {
  getByChangeId: async (changeId: string) => {
    const { data, error } = await supabase
      .from('rh_change_test_cycles')
      .select('*')
      .eq('change_id', changeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ── PRODUCTION EVENTS ─────────────────────────────────────────────
export const productionEventService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('rh_production_events')
      .select('*')
      .order('deployed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ── ACTIVITY LOG ──────────────────────────────────────────────────
export const activityService = {
  getByChangeId: async (changeId: string) => {
    const { data, error } = await supabase
      .from('rh_change_activity_log')
      .select('*')
      .eq('change_id', changeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ── COMMAND CENTER KPIs ───────────────────────────────────────────
export const commandCenterService = {
  getKPIs: async () => {
    const { data, error } = await supabase
      .from('rh_command_center_kpis')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getMappings: async () => {
    const { data, error } = await supabase
      .from('rh_release_test_cycle_links')
      .select('release_id, tm_test_cycles(*)')
      .order('linked_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ── WORK ITEM SEARCH ──────────────────────────────────────────────
export const workItemService = {
  search: async (query: string) => {
    const { data, error } = await supabase
      .from('ph_issues')
      .select('id, key, summary, status, project_key')
      .or(`key.ilike.%${query}%,summary.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
};
