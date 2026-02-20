import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fetch role_name from resource_inventory keyed by profile_id
export function useOwnerRoles(ownerIds: string[]) {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  return useQuery({
    queryKey: ['owner-roles', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await (supabase.from('resource_inventory') as any)
        .select('profile_id, role_name')
        .in('profile_id', uniqueIds)
        .eq('is_active', true);
      if (error) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { if (r.profile_id && r.role_name) map[r.profile_id] = r.role_name; });
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch full chain data for a given theme + goal combination
export function useChainIntelligence(themeId: string | null, goalId: string | null) {
  return useQuery({
    queryKey: ['chain-intelligence', themeId, goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_chain_intelligence' as any)
        .select('*')
        .eq('theme_id', themeId!)
        .eq('goal_id', goalId!);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!themeId && !!goalId,
  });
}

// Fetch stories under an epic (delivery pipeline + cycle times)
export function useEpicStories(epicId: string | null) {
  return useQuery({
    queryKey: ['epic-stories', epicId],
    queryFn: async () => {
      if (!epicId) return [];
      const { data, error } = await supabase
        .from('vw_epic_stories' as any)
        .select('*')
        .eq('epic_id', epicId);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!epicId,
  });
}

// Fetch defects/bugs/incidents linked to an epic
export function useChainDefects(epicId: string | null) {
  return useQuery({
    queryKey: ['chain-defects', epicId],
    queryFn: async () => {
      if (!epicId) return [];
      const { data, error } = await supabase
        .from('ph_work_items' as any)
        .select('*, assignee:profiles(full_name, role)')
        .eq('parent_id', epicId)
        .in('item_type', ['Bug', 'Incident'])
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data as any[]) || [];
    },
    enabled: !!epicId,
  });
}

// Fetch locked panel structure config
export function usePanelConfig() {
  return useQuery({
    queryKey: ['intelligence-panel-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('es_intelligence_panel_config' as any)
        .select('structure')
        .eq('is_active', true)
        .eq('panel_name', 'strategy_intelligence')
        .maybeSingle();
      return (data as any)?.structure || null;
    },
    staleTime: Infinity,
  });
}
