import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

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
}

export interface SyncHealth {
  lastSync: SyncLogEntry | null
  issueCachedCount: number
  versionCachedCount: number
  projectCount: number
}

export function useSyncHealth() {
  return useQuery({
    queryKey: ['wh', 'sync-health'],
    queryFn: async (): Promise<SyncHealth> => {
      const { data: lastSync } = await (supabase as any)
        .from('wh_sync_log')
        .select('*')
        .in('status', ['success', 'warning'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: issueCount } = await (supabase as any)
        .from('wh_issues')
        .select('*', { count: 'exact', head: true })

      const { count: versionCount } = await (supabase as any)
        .from('wh_versions')
        .select('*', { count: 'exact', head: true })

      const { data: conn } = await supabase
        .from('wh_jira_connection')
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
      const { data, error } = await (supabase as any)
        .from('wh_sync_log')
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
    mutationFn: async (syncType: 'incremental' | 'full' = 'full') => {
      const { data, error } = await supabase.functions.invoke('wh-jira-sync', {
        body: { sync_type: syncType },
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
      const { data, error } = await (supabase as any)
        .from('wh_config')
        .select('key, value')
        .in('key', ['sync_interval_minutes', 'sync_full_time_utc'])
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
          (supabase as any).from('wh_config').update({ value: input.sync_interval_minutes })
            .eq('key', 'sync_interval_minutes')
        )
      }
      if (input.sync_full_time_utc !== undefined) {
        updates.push(
          (supabase as any).from('wh_config').update({ value: JSON.stringify(input.sync_full_time_utc) })
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
