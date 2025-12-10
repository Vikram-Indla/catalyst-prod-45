import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LinkedTheme {
  id: string;
  name: string;
  description?: string;
}

// Fetch all themes linked to an objective
export function useObjectiveThemes(objectiveId?: string) {
  return useQuery({
    queryKey: ['objective-themes', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return [];
      const { data, error } = await supabase
        .from('objective_theme_links')
        .select(`
          id,
          theme_id,
          strategic_themes:theme_id (
            id,
            name,
            description
          )
        `)
        .eq('objective_id', objectiveId);
      if (error) throw error;
      return (data || []).map(link => link.strategic_themes).filter(Boolean) as LinkedTheme[];
    },
    enabled: !!objectiveId,
  });
}

// Fetch all available themes for selection
export function useAllThemes() {
  return useQuery({
    queryKey: ['all-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, description')
        .order('name');
      if (error) throw error;
      return (data || []) as LinkedTheme[];
    },
  });
}

// Link themes to an objective
export function useLinkThemesToObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ objectiveId, themeIds }: { objectiveId: string; themeIds: string[] }) => {
      // First, get existing links to avoid duplicates
      const { data: existing } = await supabase
        .from('objective_theme_links')
        .select('theme_id')
        .eq('objective_id', objectiveId);
      
      const existingThemeIds = new Set((existing || []).map(l => l.theme_id));
      const newThemeIds = themeIds.filter(id => !existingThemeIds.has(id));
      
      if (newThemeIds.length === 0) return [];
      
      const links = newThemeIds.map(theme_id => ({
        objective_id: objectiveId,
        theme_id,
      }));
      
      const { data, error } = await supabase
        .from('objective_theme_links')
        .insert(links)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { objectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['objective-themes', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-links'] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-counts'] });
      toast.success('Themes linked to objective');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link themes');
    },
  });
}

// Unlink themes from an objective
export function useUnlinkThemesFromObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ objectiveId, themeIds }: { objectiveId: string; themeIds: string[] }) => {
      const { error } = await supabase
        .from('objective_theme_links')
        .delete()
        .eq('objective_id', objectiveId)
        .in('theme_id', themeIds);
      if (error) throw error;
    },
    onSuccess: (_, { objectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['objective-themes', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-links'] });
      queryClient.invalidateQueries({ queryKey: ['theme-objective-counts'] });
      toast.success('Themes unlinked from objective');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlink themes');
    },
  });
}
