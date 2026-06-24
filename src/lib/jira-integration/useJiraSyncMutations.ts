import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveJiraEnvironment } from './environmentResolver';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lmqwtldpfacrrlvdnmld.supabase.co';

interface ManualSyncRequest {
  projectKey?: string;
  mode: 'full' | 'incremental' | 'dry-run';
  /** Per-run override: limit the sync to these project keys. Empty/undefined = all enabled. */
  projectKeys?: string[];
  /** Per-run override: force this lookback window (months) for every project in the run. */
  lookbackOverride?: number;
}

interface ManualSyncResponse {
  environment: string;
  recordsAdded: number;
  recordsSkipped: number;
  issuesFetched?: number;
  projectsSynced?: number;
  estimatedCount?: number;
  errors: Array<{ issue: string; reason: string }>;
}

interface SyncFilterRow {
  project_key: string;
  lookback_months: number;
  date_basis: string;
  include_types: string[];
  include_statuses: string[];
  sprint_release: string[];
}

/**
 * Loads per-project sync filters from jira_project_sync_filters for the active
 * environment and shapes them into the wh-jira-sync `project_configs` contract:
 *   { [projectKey]: { lookback_months, issue_types, statuses, sprint_release } }
 */
async function loadProjectConfigs(environment: string, only?: string[]) {
  const [{ data: filterRows }, { data: fieldRows }] = await Promise.all([
    supabase
      .from('jira_project_sync_filters')
      .select('project_key, lookback_months, date_basis, include_types, include_statuses, sprint_release')
      .eq('environment', environment),
    supabase
      .from('jira_project_field_mappings')
      .select('project_key, target_column, jira_field')
      .eq('environment', environment),
  ]);

  // Per-project field remap: { [project_key]: { [target_column]: jira_field } }
  const fieldMaps: Record<string, Record<string, string>> = {};
  for (const fr of (fieldRows ?? []) as Array<{ project_key: string; target_column: string; jira_field: string }>) {
    (fieldMaps[fr.project_key] ??= {})[fr.target_column] = fr.jira_field;
  }

  const rows = (filterRows ?? []) as SyncFilterRow[];
  const project_configs: Record<string, {
    lookback_months: number; issue_types?: string[]; statuses?: string[]; sprint_release?: string[];
    field_map?: Record<string, string>;
  }> = {};
  // Seed from filter rows.
  for (const r of rows) {
    if (only && only.length && !only.includes(r.project_key)) continue;
    project_configs[r.project_key] = {
      lookback_months: r.lookback_months ?? 3,
      issue_types: r.include_types?.length ? r.include_types : undefined,
      statuses: r.include_statuses?.length ? r.include_statuses : undefined,
      sprint_release: r.sprint_release?.length ? r.sprint_release : undefined,
    };
  }
  // Attach field maps (also create a config entry for projects that have only a field map).
  for (const [pk, fm] of Object.entries(fieldMaps)) {
    if (only && only.length && !only.includes(pk)) continue;
    (project_configs[pk] ??= { lookback_months: 3 }).field_map = fm;
  }
  return project_configs;
}

interface RefreshDataRequest {
  projectKeys: string[];
  confirmationPhrase: string;
  mode: 'dry-run' | 'confirmed';
}

interface RefreshDataResponse {
  environment: string;
  recordsDeleted: number;
  recordsReloaded: number;
  errors: Array<{ reason: string }>;
}

/**
 * Manual sync mutation — discover, apply filters, sync issues from Jira
 */
export function useManualSyncMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (request: ManualSyncRequest): Promise<ManualSyncResponse> => {
      // Dry-run: lightweight read-only estimate via jira-manual-sync (no engine dry-run mode).
      if (request.mode === 'dry-run') {
        const { data, error } = await supabase.functions.invoke('jira-manual-sync', { body: request });
        if (error) throw error;
        return data;
      }

      // full / incremental: canonical engine (2026 guard + parent pull-through), fed by filters table.
      const only = request.projectKeys?.length
        ? request.projectKeys
        : (request.projectKey ? [request.projectKey] : undefined);
      const project_configs = await loadProjectConfigs(env.environment, only);

      // Per-run date override: force lookback for every project in the run. Ensure each
      // selected key has a config entry even if it has no persisted filter row.
      if (request.lookbackOverride != null) {
        const keys = only ?? Object.keys(project_configs);
        for (const k of keys) {
          project_configs[k] = { ...(project_configs[k] ?? { lookback_months: request.lookbackOverride }), lookback_months: request.lookbackOverride };
        }
      }

      const { data, error } = await supabase.functions.invoke('wh-jira-sync', {
        body: {
          sync_type: request.mode, // 'full' | 'incremental'
          projects: only,          // undefined => engine syncs all configured projects
          project_configs,
        },
      });
      if (error) throw error;

      // Adapt engine response to the UI's ManualSyncResponse shape.
      return {
        environment: env.environment,
        recordsAdded: data?.issues_upserted ?? 0,
        recordsSkipped: 0,
        issuesFetched: data?.issues_fetched ?? 0,
        projectsSynced: Array.isArray(data?.projects_synced) ? data.projects_synced.length : undefined,
        errors: data?.success === false ? [{ issue: 'sync', reason: data?.error ?? 'Sync failed' }] : [],
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jira-projects', env.environment] });
      queryClient.invalidateQueries({ queryKey: ['jira-sync-logs', env.environment] });
    },
  });
}

/**
 * Refresh data mutation — delete Jira-origin rows, reload fresh from Jira
 */
export function useRefreshDataMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (request: RefreshDataRequest): Promise<RefreshDataResponse> => {
      if (env.isProductionRuntime && request.mode === 'confirmed') {
        const requiredPhrase = 'REFRESH PRODUCTION JIRA DATA';
        if (request.confirmationPhrase !== requiredPhrase) {
          throw new Error('Invalid confirmation phrase');
        }
      }

      const { data, error } = await supabase.functions.invoke('jira-refresh-data', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-projects', env.environment] });
      queryClient.invalidateQueries({ queryKey: ['jira-sync-logs', env.environment] });
    },
  });
}

export interface ProjectSyncFilter {
  project_key: string;
  lookback_months: number;
  date_basis: 'created' | 'updated';
  include_types: string[];
  include_statuses: string[];
  sprint_release: string[];
  module_target: string | null;
}

/** Save (upsert) one project's sync filter for the active environment. */
export function useSaveSyncFilterMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (filter: ProjectSyncFilter) => {
      const { error } = await supabase
        .from('jira_project_sync_filters')
        .upsert({
          environment: env.environment,
          project_key: filter.project_key,
          lookback_months: filter.lookback_months,
          date_basis: filter.date_basis,
          include_types: filter.include_types,
          include_statuses: filter.include_statuses,
          sprint_release: filter.sprint_release,
          module_target: filter.module_target,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'environment,project_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-sync-filters', env.environment] });
    },
  });
}

/** Read all per-project sync filters for the active environment. */
export function useSyncFilters() {
  const env = resolveJiraEnvironment();
  return useQuery({
    queryKey: ['jira-sync-filters', env.environment],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_project_sync_filters')
        .select('project_key, lookback_months, date_basis, include_types, include_statuses, sprint_release, module_target')
        .eq('environment', env.environment);
      return (data ?? []) as ProjectSyncFilter[];
    },
    staleTime: 15_000,
  });
}

export interface ProjectFieldMapping {
  project_key: string;
  target_column: string;
  jira_field: string;
}

/** Real, remappable ph_issues columns offered in the per-project field-mapping editor. */
export const FIELD_MAP_TARGETS: Array<{ value: string; label: string }> = [
  { value: 'priority', label: 'Priority' },
  { value: 'assignee_account_id', label: 'Assignee' },
  { value: 'parent_key', label: 'Parent' },
  { value: 'due_date', label: 'Due date' },
  { value: 'status', label: 'Status' },
  { value: 'labels', label: 'Labels' },
  { value: 'fix_versions', label: 'Fix versions' },
  { value: 'components', label: 'Components' },
];

/** Read all per-project field mappings for the active environment. */
export function useFieldMappings() {
  const env = resolveJiraEnvironment();
  return useQuery({
    queryKey: ['jira-field-mappings', env.environment],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_project_field_mappings')
        .select('project_key, target_column, jira_field')
        .eq('environment', env.environment);
      return (data ?? []) as ProjectFieldMapping[];
    },
    staleTime: 15_000,
  });
}

/** Upsert (jira_field set) or delete (jira_field empty) one per-project field mapping. */
export function useSaveFieldMappingMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();
  return useMutation({
    mutationFn: async (m: ProjectFieldMapping) => {
      if (!m.jira_field.trim()) {
        const { error } = await supabase
          .from('jira_project_field_mappings')
          .delete()
          .eq('environment', env.environment)
          .eq('project_key', m.project_key)
          .eq('target_column', m.target_column);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('jira_project_field_mappings')
        .upsert({
          environment: env.environment,
          project_key: m.project_key,
          target_column: m.target_column,
          jira_field: m.jira_field.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'environment,project_key,target_column' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jira-field-mappings', env.environment] }),
  });
}

/**
 * Webhook toggle mutation
 */
export function useWebhookToggleMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase
        .from('jira_webhook_control')
        .update({ listening_enabled: enabled })
        .eq('environment', env.environment)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-control', env.environment] });
    },
  });
}
