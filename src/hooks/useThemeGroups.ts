/**
 * Hook for managing strategic themes (Theme Groups admin page)
 * Includes CRUD operations, linked epic counts, and reassignment logic
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

type ThemeStatus = 'active' | 'proposed' | 'done' | 'cancelled';

export interface ThemeGroupWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color_tag: string | null;
  start_date: string | null;
  end_date: string | null;
  snapshot_id: string;
  created_at: string;
  updated_at: string;
  epic_count: number;
  objective_count: number;
}

// Fetch all themes with linked item counts
export function useThemeGroupsWithCounts() {
  return useQuery({
    queryKey: ['theme-groups-with-counts'],
    queryFn: async () => {
      // Fetch themes
      const { data: themes, error: themesError } = await supabase
        .from('strategic_themes')
        .select('*')
        .order('name');
      
      if (themesError) throw themesError;
      
      if (!themes || themes.length === 0) {
        return [] as ThemeGroupWithCounts[];
      }
      
      const themeIds = themes.map(t => t.id);
      
      // Fetch epic counts per theme
      const { data: epicCounts, error: epicError } = await supabase
        .from('epics')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      if (epicError) throw epicError;
      
      // Fetch objective links per theme
      const { data: objectiveLinks, error: objError } = await supabase
        .from('objective_theme_links')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      if (objError) throw objError;
      
      // Count epics and objectives per theme
      const epicCountMap = new Map<string, number>();
      const objectiveCountMap = new Map<string, number>();
      
      epicCounts?.forEach(e => {
        if (e.theme_id) {
          epicCountMap.set(e.theme_id, (epicCountMap.get(e.theme_id) || 0) + 1);
        }
      });
      
      objectiveLinks?.forEach(o => {
        if (o.theme_id) {
          objectiveCountMap.set(o.theme_id, (objectiveCountMap.get(o.theme_id) || 0) + 1);
        }
      });
      
      // Combine into result
      return themes.map(theme => ({
        ...theme,
        epic_count: epicCountMap.get(theme.id) || 0,
        objective_count: objectiveCountMap.get(theme.id) || 0,
      })) as ThemeGroupWithCounts[];
    },
  });
}

// Fetch epics linked to a specific theme
export function useThemeLinkedEpics(themeId: string | null) {
  return useQuery({
    queryKey: ['theme-linked-epics', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name')
        .eq('theme_id', themeId)
        .order('epic_key');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!themeId,
  });
}

// Update theme status (active/inactive)
export function useUpdateThemeStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ThemeStatus }) => {
      const { error } = await supabase
        .from('strategic_themes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-groups-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      catalystToast.success('Status Updated', 'Theme status has been updated.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to update theme status.');
    },
  });
}

// Reassign epics from one theme to another
export function useReassignEpicsToTheme() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fromThemeId, toThemeId }: { fromThemeId: string; toThemeId: string | null }) => {
      const { error } = await supabase
        .from('epics')
        .update({ theme_id: toThemeId, updated_at: new Date().toISOString() })
        .eq('theme_id', fromThemeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-groups-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['theme-linked-epics'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      catalystToast.success('Epics Reassigned', 'Linked epics have been moved to the new theme.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to reassign epics.');
    },
  });
}

// Delete a theme (only if no linked items)
export function useDeleteThemeGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are any linked epics
      const { count: epicCount } = await supabase
        .from('epics')
        .select('id', { count: 'exact', head: true })
        .eq('theme_id', id);
      
      if (epicCount && epicCount > 0) {
        throw new Error('Cannot delete theme with linked epics. Please reassign them first.');
      }
      
      // Check for objective links
      const { count: objCount } = await supabase
        .from('objective_theme_links')
        .select('id', { count: 'exact', head: true })
        .eq('theme_id', id);
      
      if (objCount && objCount > 0) {
        // Delete objective links first
        await supabase
          .from('objective_theme_links')
          .delete()
          .eq('theme_id', id);
      }
      
      // Delete the theme
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-groups-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      catalystToast.success('Theme Deleted', 'Strategic theme has been deleted.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to delete theme.');
    },
  });
}
