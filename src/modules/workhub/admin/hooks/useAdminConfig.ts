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
        .from('ph_user_mapping')
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
        .from('ph_user_mapping')
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
      // 1. Save the mappings
      const promises = mappings.map(m =>
        (supabase as any).from('ph_user_mapping')
          .update({
            catalyst_profile_id: m.catalyst_profile_id,
            is_mapped: m.catalyst_profile_id !== null,
          })
          .eq('id', m.id)
      )
      await Promise.all(promises)

      // 2. Propagate Jira avatars to profiles.avatar_url for mapped users
      const mappedIds = mappings
        .filter(m => m.catalyst_profile_id)
        .map(m => m.id)
      if (mappedIds.length > 0) {
        const { data: jiraRecords } = await (supabase as any)
          .from('ph_user_mapping')
          .select('catalyst_profile_id, jira_avatar_url')
          .in('id', mappedIds)
          .not('jira_avatar_url', 'eq', '')
          .not('catalyst_profile_id', 'is', null)

        if (jiraRecords && jiraRecords.length > 0) {
          const avatarUpdates = jiraRecords.map((r: any) =>
            supabase.from('profiles')
              .update({ avatar_url: r.jira_avatar_url })
              .eq('id', r.catalyst_profile_id)
          )
          await Promise.all(avatarUpdates)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
      qc.invalidateQueries({ queryKey: ['wh', 'catalyst-profiles-dept'] })
    },
  })
}

export function useAutoMatchUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: unmapped } = await (supabase as any)
        .from('ph_user_mapping')
        .select('id, jira_email, jira_avatar_url')
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
          await (supabase as any).from('ph_user_mapping')
            .update({
              catalyst_profile_id: match.id,
              is_mapped: true,
              auto_matched: true,
            })
            .eq('id', u.id)

          // Propagate Jira avatar to profile
          if (u.jira_avatar_url) {
            await supabase.from('profiles')
              .update({ avatar_url: u.jira_avatar_url })
              .eq('id', match.id)
          }
          matched++
        }
      }
      return { matched }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...USER_MAP_KEY] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
      qc.invalidateQueries({ queryKey: ['wh', 'catalyst-profiles-dept'] })
    },
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

// ═══ CATALYST PROFILES (enriched with department) ═══

export interface CatalystProfileWithDept {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  department_id: string | null
  department_name: string | null
}

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

export function useCatalystProfilesWithDept() {
  return useQuery({
    queryKey: ['wh', 'catalyst-profiles-dept'],
    queryFn: async () => {
      // Use resource_inventory as primary source of truth
      const [riRes, profilesRes, deptsRes] = await Promise.all([
        (supabase as any)
          .from('resource_inventory')
          .select('id, profile_id, name, email, department_id, role_name')
          .eq('is_active', true),
        supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url'),
        (supabase as any)
          .from('capacity_departments')
          .select('id, name')
          .eq('is_active', true),
      ])

      if (riRes.error) throw riRes.error
      if (profilesRes.error) throw profilesRes.error
      if (deptsRes.error) throw deptsRes.error

      const deptMap: Record<string, string> = {}
      deptsRes.data?.forEach((d: any) => { deptMap[d.id] = d.name })

      const profileMap: Record<string, any> = {}
      profilesRes.data?.forEach((p: any) => { profileMap[p.id] = p })

      const seen = new Set<string>()
      const result: CatalystProfileWithDept[] = []

      // Walk resource_inventory first – every active resource appears
      for (const ri of (riRes.data || [])) {
        const profile = ri.profile_id ? profileMap[ri.profile_id] : null
        const id = profile?.id || ri.id
        if (seen.has(id)) continue
        seen.add(id)

        result.push({
          id,
          full_name: profile?.full_name || ri.name || 'Unnamed',
          email: profile?.email || ri.email || null,
          role: profile?.role || ri.role_name || null,
          avatar_url: profile?.avatar_url || null,
          department_id: ri.department_id || null,
          department_name: ri.department_id ? (deptMap[ri.department_id] || null) : null,
        })
      }

      // Also include any profile not in resource_inventory
      for (const p of (profilesRes.data || [])) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        result.push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          avatar_url: p.avatar_url,
          department_id: null,
          department_name: null,
        })
      }

      result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
      return result
    },
    staleTime: 60_000,
  })
}

export function useCapacityDepartments() {
  return useQuery({
    queryKey: ['wh', 'capacity-departments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('capacity_departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data || []) as Array<{ id: string; name: string }>
    },
    staleTime: 60_000,
  })
}
