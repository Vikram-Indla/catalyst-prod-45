import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ConfigKey, JiraUserMapping } from '../types/admin-config.types'

const CONFIG_KEY = ['wh', 'config'] as const
const USER_MAP_KEY = ['wh', 'user-mapping'] as const

// ═══ CONFIG HOOKS ═══

export function useWhConfig() {
  return useQuery({
    queryKey: [...CONFIG_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('wh_config')
        .select('key, value')
      if (error) throw error
      const map: Record<string, any> = {}
      data?.forEach((row: any) => {
        try {
          map[row.key] = typeof row.value === 'string'
            ? JSON.parse(row.value)
            : row.value
        } catch {
          map[row.key] = row.value
        }
      })
      return map
    },
    staleTime: 30_000,
  })
}

export function useUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: ConfigKey; value: any }) => {
      const { error } = await (supabase as any)
        .from('wh_config')
        .update({ value: typeof value === 'string' ? value : JSON.stringify(value) })
        .eq('key', key)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CONFIG_KEY] }),
  })
}

export function useBatchUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Array<{ key: ConfigKey; value: any }>) => {
      const promises = updates.map(({ key, value }) =>
        (supabase as any).from('wh_config')
          .update({ value: typeof value === 'string' ? value : JSON.stringify(value) })
          .eq('key', key)
      )
      const results = await Promise.all(promises)
      const firstError = results.find((r: any) => r.error)
      if (firstError?.error) throw firstError.error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CONFIG_KEY] }),
  })
}

// ═══ HIERARCHY HELPERS ═══

export function useHierarchyLevels() {
  const { data: config, ...rest } = useWhConfig()
  return {
    ...rest,
    data: (config?.hierarchy_levels || []) as import('../types/admin-config.types').HierarchyLevel[],
  }
}

export function useStatusMapping() {
  const { data: config, ...rest } = useWhConfig()
  return {
    ...rest,
    data: (config?.status_mapping || {}) as import('../types/admin-config.types').StatusMapping,
  }
}

// ═══ USER MAPPING HOOKS ═══

export function useUserMappings() {
  return useQuery({
    queryKey: [...USER_MAP_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('wh_user_mapping')
        .select('*')
        .order('is_mapped', { ascending: false })
        .order('jira_display_name')
      if (error) throw error
      return (data || []) as JiraUserMapping[]
    },
    staleTime: 30_000,
  })
}

export function useUpdateUserMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, catalyst_profile_id }: {
      id: string
      catalyst_profile_id: string | null
    }) => {
      const { error } = await (supabase as any)
        .from('wh_user_mapping')
        .update({
          catalyst_profile_id,
          is_mapped: catalyst_profile_id !== null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] }),
  })
}

export function useBatchSaveUserMappings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mappings: Array<{ id: string; catalyst_profile_id: string | null }>) => {
      const promises = mappings.map(m =>
        (supabase as any).from('wh_user_mapping')
          .update({
            catalyst_profile_id: m.catalyst_profile_id,
            is_mapped: m.catalyst_profile_id !== null,
          })
          .eq('id', m.id)
      )
      await Promise.all(promises)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] }),
  })
}

export function useAutoMatchUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: unmapped } = await (supabase as any)
        .from('wh_user_mapping')
        .select('id, jira_email')
        .eq('is_mapped', false)
        .neq('jira_email', '')

      if (!unmapped || unmapped.length === 0) return { matched: 0 }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')

      if (!profiles) return { matched: 0 }

      let matched = 0
      for (const u of unmapped) {
        const match = profiles.find(
          (p: any) => p.email?.toLowerCase() === u.jira_email?.toLowerCase()
        )
        if (match) {
          await (supabase as any).from('wh_user_mapping')
            .update({
              catalyst_profile_id: match.id,
              is_mapped: true,
              auto_matched: true,
            })
            .eq('id', u.id)
          matched++
        }
      }
      return { matched }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] }),
  })
}

export function useRefreshJiraUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wh-jira-sync', {
        body: { sync_type: 'incremental' },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] })
      qc.invalidateQueries({ queryKey: ['wh', 'sync-health'] })
    },
  })
}

// ═══ CATALYST PROFILES ═══

export function useCatalystProfiles() {
  return useQuery({
    queryKey: ['wh', 'catalyst-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .order('full_name')
      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })
}
