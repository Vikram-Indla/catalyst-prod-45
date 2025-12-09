import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface ObjectiveThemeLink {
  id: string;
  objective_id: string;
  theme_id: string;
  created_at: string;
}

// Fetch all objective-theme links for a theme
export function useThemeObjectiveLinks(themeId?: string) {
  return useQuery({
    queryKey: ['theme-objective-links', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      const { data, error } = await supabase
        .from('objective_theme_links')
        .select(`
          id,
          objective_id,
          theme_id,
          created_at,
          objectives:objective_id (
            id,
            summary,
            tier,
            status,
            health,
            score,
            owner_id,
            program_increment_ids,
            updated_at
          )
        `)
        .eq('theme_id', themeId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!themeId,
  });
}

// Fetch linked objective IDs for multiple themes
export function useThemesObjectiveCounts(themeIds: string[]) {
  return useQuery({
    queryKey: ['theme-objective-counts', themeIds],
    queryFn: async () => {
      if (!themeIds.length) return {};
      const { data, error } = await supabase
        .from('objective_theme_links')
        .select('theme_id, objective_id')
        .in('theme_id', themeIds);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      themeIds.forEach(id => { counts[id] = 0; });
      data?.forEach(link => {
        counts[link.theme_id] = (counts[link.theme_id] || 0) + 1;
      });
      return counts;
    },
    enabled: themeIds.length > 0,
  });
}

// Bulk link objectives to a theme
export function useLinkObjectivesToTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ themeId, objectiveIds }: { themeId: string; objectiveIds: string[] }) => {
      const links = objectiveIds.map(objective_id => ({
        theme_id: themeId,
        objective_id,
      }));
      const { data, error } = await supabase
        .from('objective_theme_links')
        .insert(links)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { themeId }) => {
      queryClient.invalidateQueries({ queryKey: ['theme-objective-links', themeId] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-counts'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      catalystToast.success('Success', 'Objectives linked to theme.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to link objectives.');
    },
  });
}

// Bulk unlink objectives from a theme
export function useUnlinkObjectivesFromTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ themeId, objectiveIds }: { themeId: string; objectiveIds: string[] }) => {
      const { error } = await supabase
        .from('objective_theme_links')
        .delete()
        .eq('theme_id', themeId)
        .in('objective_id', objectiveIds);
      if (error) throw error;
    },
    onSuccess: (_, { themeId }) => {
      queryClient.invalidateQueries({ queryKey: ['theme-objective-links', themeId] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-counts'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      catalystToast.success('Success', 'Objectives unlinked from theme.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to unlink objectives.');
    },
  });
}
