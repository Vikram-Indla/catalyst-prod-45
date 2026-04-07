import { supabase } from '@/integrations/supabase/client';
import type { PermissionLevel, CreateCatalystUserPayload } from '@/types/jiraSync';

export const fetchJiraSyncUsers = async (
  page: number,
  filter: string,
  search: string,
  perPage: number = 10
) => {
  let query = supabase
    .from('jira_identity_map')
    .select(`
      *,
      jira_user_project_perms (
        id, project_id, project_name, project_key, permission_level, synced_from_jira
      )
    `, { count: 'exact' });

  if (filter === 'jira')
    query = query.eq('catalyst_only', false).eq('is_active_in_catalyst', true);
  if (filter === 'local')
    query = query.eq('catalyst_only', true);
  if (filter === 'conflict')
    query = query.not('conflict_fields', 'eq', '{}');
  if (filter === 'inactive')
    query = query.eq('is_active_in_catalyst', false);
  if (search)
    query = query.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%,jira_account_id.ilike.%${search}%`
    );

  const from = (page - 1) * perPage;
  return query.range(from, from + perPage - 1).order('display_name', { ascending: true });
};

export const fetchSyncStats = async () => {
  const [jira, local, proxy, inactive, conflicts, webhooks] = await Promise.all([
    supabase.from('jira_identity_map')
      .select('*', { count: 'exact', head: true })
      .eq('catalyst_only', false).eq('is_active_in_catalyst', true),
    supabase.from('jira_identity_map')
      .select('*', { count: 'exact', head: true })
      .eq('catalyst_only', true),
    supabase.from('jira_identity_map')
      .select('*', { count: 'exact', head: true })
      .eq('auth_mode', 'jira_proxy'),
    supabase.from('jira_identity_map')
      .select('*', { count: 'exact', head: true })
      .eq('is_active_in_catalyst', false),
    supabase.from('jira_identity_map')
      .select('*', { count: 'exact', head: true })
      .not('conflict_fields', 'eq', '{}'),
    supabase.from('jira_webhook_events')
      .select('*', { count: 'exact', head: true })
      .gte('received_at', new Date(Date.now() - 86400000).toISOString()),
  ]);
  return {
    jiraSynced: jira.count ?? 0,
    catalystOnly: local.count ?? 0,
    proxyAuth: proxy.count ?? 0,
    conflicts: conflicts.count ?? 0,
    inactive: inactive.count ?? 0,
    webhooks24h: webhooks.count ?? 0,
  };
};

export const fetchUserDetail = async (id: string) =>
  supabase.from('jira_identity_map').select(`
    *,
    jira_user_project_perms (*),
    jira_sync_user_events (
      id, event_type, direction, changed_fields, error_message, created_at
    )
  `).eq('id', id).single();

export const fetchSyncRuns = async () =>
  supabase.from('jira_sync_runs')
    .select('*').order('started_at', { ascending: false }).limit(10);

export const toggleUserStatus = async (id: string, isActive: boolean) => {
  const { error } = await supabase.from('jira_identity_map')
    .update({ is_active_in_catalyst: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  // Fire write-back to Jira (fire-and-forget)
  supabase.functions.invoke('jira-write-back', {
    body: { identity_map_id: id, action: isActive ? 'reactivate' : 'deactivate' },
  }).catch(() => {});

  return { id, isActive };
};

export const updateProjectPerm = async (permId: string, level: PermissionLevel) =>
  supabase.from('jira_user_project_perms')
    .update({ permission_level: level, updated_at: new Date().toISOString() })
    .eq('id', permId);

export const createCatalystUser = async (payload: CreateCatalystUserPayload) => {
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    });
  if (authError) throw authError;
  const { data, error } = await supabase.from('jira_identity_map').insert({
    email: payload.email,
    display_name: payload.displayName,
    catalyst_user_id: authData.user?.id,
    auth_mode: 'local',
    catalyst_only: true,
    is_active_in_catalyst: true,
    is_active_in_jira: false,
    jira_groups: [],
    resource_role_id: payload.resourceRoleId,
    last_synced_at: null,
  }).select().single();
  if (error) throw error;
  return data;
};

export const triggerManualSync = () =>
  supabase.functions.invoke('jira-user-sync', {
    body: { trigger: 'manual', direction: 'both' },
  });

export const copyPermissions = async (sourceId: string, targetIds: string[]) => {
  const { data: perms } = await supabase
    .from('jira_user_project_perms').select('*').eq('identity_map_id', sourceId);
  if (!perms?.length) return;
  const rows = targetIds.flatMap(tid =>
    perms.map(p => ({
      identity_map_id: tid,
      project_id: p.project_id,
      project_name: p.project_name,
      project_key: p.project_key,
      permission_level: p.permission_level,
      synced_from_jira: false,
    }))
  );
  return supabase.from('jira_user_project_perms')
    .upsert(rows, { onConflict: 'identity_map_id,project_id' });
};
