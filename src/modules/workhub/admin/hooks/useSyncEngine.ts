import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, typedQuery } from '@/integrations/supabase/client'

export interface SyncLogEntry {
  id: string
  sync_type: 'incremental' | 'full'
  status: 'running' | 'success' | 'warning' | 'error'
  issues_fetched: number
  issues_upserted: number
  issues_pruned: number
  versions_fetched: number
  warnings: string[]
  error_message: string | null
  duration_ms: number
  started_at: string
  completed_at: string | null
  lookback_months: number
  jql_query: string
  projects_synced: string[] | null
}

export interface SyncHealth {
  lastSync: SyncLogEntry | null
  issueCachedCount: number
  versionCachedCount: number
  projectCount: number
}

/**
 * Returns true when there's a sync_log entry with status='running' (background sync active).
 * Polls every 5s so the CTA button can show a pulsing state.
 */
export function useIsSyncRunning() {
  return useQuery({
    queryKey: ['wh', 'sync-running'],
    queryFn: async () => {
      const { data } = await typedQuery('ph_sync_log')
        .select('id')
        .eq('status', 'running')
        .limit(1)
      return (data && data.length > 0) as boolean
    },
    staleTime: 3_000,
    refetchInterval: 5_000,
  })
}

export function useSyncHealth() {
  return useQuery({
    queryKey: ['wh', 'sync-health'],
    queryFn: async (): Promise<SyncHealth> => {
      const { data: lastSync } = await typedQuery('ph_sync_log')
        .select('*')
        .in('status', ['success', 'warning'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: issueCount } = await typedQuery('ph_issues')
        .select('*', { count: 'exact', head: true })

      const { count: versionCount } = await typedQuery('ph_versions')
        .select('*', { count: 'exact', head: true })

      const { data: conn } = await supabase
        .from('ph_jira_connection')
        .select('project_count')
        .single()

      return {
        lastSync: lastSync as SyncLogEntry | null,
        issueCachedCount: issueCount || 0,
        versionCachedCount: versionCount || 0,
        projectCount: conn?.project_count || 0,
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useSyncLogs(limit: number = 10) {
  return useQuery({
    queryKey: ['wh', 'sync-logs', limit],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(error.message)
      return data as SyncLogEntry[]
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useForceSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      sync_type?: 'incremental' | 'full'
      lookback_months?: number
      issue_types?: string[]
      fix_versions?: string[]
      projects?: string[]
      project_configs?: Record<string, { lookback_months: number; status_categories?: string[]; statuses?: string[]; issue_types?: string[]; fix_versions?: string[] }>
    } = {}) => {
      const { data, error } = await supabase.functions.invoke('wh-jira-bulk-sync', {
        body: {
          sync_type: params.sync_type || 'full',
          lookback_months: params.lookback_months,
          issue_types: params.issue_types?.length ? params.issue_types : undefined,
          fix_versions: params.fix_versions?.length ? params.fix_versions : undefined,
          projects: params.projects?.length ? params.projects : undefined,
          project_configs: params.project_configs || undefined,
        },
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh', 'sync-health'] })
      queryClient.invalidateQueries({ queryKey: ['wh', 'sync-logs'] })
    },
  })
}

export function useSyncConfig() {
  return useQuery({
    queryKey: ['wh', 'sync-config'],
    queryFn: async () => {
      const { data, error } = await typedQuery('wh_config')
        .select('key, value')
        .in('key', ['sync_interval_minutes', 'sync_full_time_utc', 'sync_max_months', 'sync_lookback_months', 'sync_issue_types', 'sync_fix_versions', 'sync_projects', 'sync_project_config'])
      if (error) throw new Error(error.message)
      const cfg: Record<string, any> = {}
      data?.forEach((c: any) => {
        try {
          cfg[c.key] = typeof c.value === 'string' ? JSON.parse(c.value) : c.value
        } catch {
          cfg[c.key] = c.value
        }
      })
      return cfg
    },
  })
}

export interface JiraProject {
  key: string
  name: string
  type?: string
}

export function useAvailableProjects() {
  return useQuery({
    queryKey: ['wh', 'available-projects'],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_jira_connection')
        .select('accessible_projects')
        .single()
      if (error) throw new Error(error.message)
      const raw = data?.accessible_projects
      const projects: any[] = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
          ? JSON.parse(raw)
          : []
      return projects
        .filter((p: any) => p && p.key)
        .map((p: any) => ({ key: String(p.key), name: String(p.name || p.key), type: p.type ? String(p.type) : undefined }))
        .sort((a: JiraProject, b: JiraProject) => a.key.localeCompare(b.key)) as JiraProject[]
    },
    staleTime: 60_000,
  })
}

export function useAvailableIssueTypes() {
  return useQuery({
    queryKey: ['wh', 'available-issue-types'],
    queryFn: async () => {
      const types = new Set<string>()
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await typedQuery('ph_issues')
          .select('issue_type')
          .range(from, from + pageSize - 1)
        if (error) throw new Error(error.message)
        if (!data || data.length === 0) break
        data.forEach((r: any) => types.add(r.issue_type))
        if (data.length < pageSize) break
        from += pageSize
      }
      return Array.from(types).sort()
    },
    staleTime: 60_000,
  })
}

export function useAvailableFixVersions() {
  return useQuery({
    queryKey: ['wh', 'available-fix-versions'],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_versions')
        .select('name, project_key, released')
        .order('name')
        .limit(5000)
      if (error) throw new Error(error.message)
      return (data || []) as Array<{ name: string; project_key: string; released: boolean }>
    },
    staleTime: 60_000,
  })
}

export function useUpdateSyncSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sync_interval_minutes?: number
      sync_full_time_utc?: string
    }) => {
      const updates = []
      if (input.sync_interval_minutes !== undefined) {
        updates.push(
          typedQuery('wh_config').update({ value: input.sync_interval_minutes })
            .eq('key', 'sync_interval_minutes')
        )
      }
      if (input.sync_full_time_utc !== undefined) {
        updates.push(
          typedQuery('wh_config').update({ value: input.sync_full_time_utc })
            .eq('key', 'sync_full_time_utc')
        )
      }
      await Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh'] })
    },
  })
}

export function useSaveFilterSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sync_projects?: string[]
      sync_issue_types?: string[]
      sync_fix_versions?: string[]
      sync_lookback_months?: number
      sync_project_config?: Record<string, { lookback_months: number; status_categories?: string[]; statuses?: string[]; issue_types?: string[]; fix_versions?: string[] }>
    }) => {
      const updates = []
      if (input.sync_projects !== undefined) {
        updates.push(
          typedQuery('wh_config').upsert({ key: 'sync_projects', value: input.sync_projects }, { onConflict: 'key' })
        )
      }
      if (input.sync_issue_types !== undefined) {
        updates.push(
          typedQuery('wh_config').upsert({ key: 'sync_issue_types', value: input.sync_issue_types }, { onConflict: 'key' })
        )
      }
      if (input.sync_fix_versions !== undefined) {
        updates.push(
          typedQuery('wh_config').upsert({ key: 'sync_fix_versions', value: input.sync_fix_versions }, { onConflict: 'key' })
        )
      }
      if (input.sync_lookback_months !== undefined) {
        updates.push(
          typedQuery('wh_config').upsert({ key: 'sync_lookback_months', value: input.sync_lookback_months }, { onConflict: 'key' })
        )
      }
      if (input.sync_project_config !== undefined) {
        updates.push(
          typedQuery('wh_config').upsert({ key: 'sync_project_config', value: input.sync_project_config }, { onConflict: 'key' })
        )
      }
      await Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh', 'sync-config'] })
    },
  })
}
