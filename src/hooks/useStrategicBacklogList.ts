/**
 * useStrategicBacklogList - Unified hook for Strategic Backlog data fetching
 * Supports themes, objectives, and epics with realtime subscriptions
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback, useMemo } from 'react';

export type BacklogTab = 'themes' | 'objectives' | 'epics';

export interface BacklogListParams {
  tab: BacklogTab;
  snapshotId: string;
  themeIds: string[];
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface BacklogRow {
  id: string;
  name: string;
  status?: string | null;
  updated_at: string;
  theme_id?: string | null;
  // Theme-specific
  description?: string | null;
  color_tag?: string | null;
  // Objective-specific
  overall_progress?: number | null;
  // Epic-specific
  epic_key?: string | null;
  priority?: string | null;
}

export interface BacklogListResult {
  rows: BacklogRow[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface BacklogCounts {
  themes: number;
  objectives: number;
  epics: number;
}

// Main data fetching hook
export function useStrategicBacklogList({
  tab,
  snapshotId,
  themeIds,
  search = '',
  sortColumn = 'name',
  sortDirection = 'asc',
}: BacklogListParams): BacklogListResult {
  const queryClient = useQueryClient();

  // Determine the table and query based on tab
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['strategic-backlog-list', tab, snapshotId, themeIds, search, sortColumn, sortDirection],
    queryFn: async () => {
      if (!snapshotId) return [];
      
      switch (tab) {
        case 'themes': {
          let query = supabase
            .from('strategic_themes')
            .select('*')
            .eq('snapshot_id', snapshotId);
          
          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
          }
          
          query = query.order(sortColumn as any, { ascending: sortDirection === 'asc' });
          
          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        }
        
        case 'objectives': {
          if (themeIds.length === 0) return [];
          
          let query = supabase
            .from('objectives')
            .select('*')
            .in('theme_id', themeIds);
          
          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
          }
          
          query = query.order(sortColumn as any, { ascending: sortDirection === 'asc' });
          
          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        }
        
        case 'epics': {
          if (themeIds.length === 0) return [];
          
          let query = supabase
            .from('epics')
            .select('*')
            .in('theme_id', themeIds);
          
          if (search) {
            query = query.or(`name.ilike.%${search}%,epic_key.ilike.%${search}%`);
          }
          
          query = query.order(sortColumn as any, { ascending: sortDirection === 'asc' });
          
          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        }
        
        default:
          return [];
      }
    },
    enabled: !!snapshotId && (tab === 'themes' || themeIds.length > 0),
  });

  return {
    rows: (data || []) as BacklogRow[],
    totalCount: (data || []).length,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Hook for live counts across all tabs
export function useStrategicBacklogCounts(snapshotId: string, themeIds: string[]): {
  counts: BacklogCounts;
  isLoading: boolean;
  refetch: () => void;
} {
  const queryClient = useQueryClient();

  // Themes count
  const { data: themesCount = 0, refetch: refetchThemes, isLoading: loadingThemes } = useQuery({
    queryKey: ['strategic-backlog-count', 'themes', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return 0;
      const { count, error } = await supabase
        .from('strategic_themes')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_id', snapshotId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!snapshotId,
  });

  // Objectives count
  const { data: objectivesCount = 0, refetch: refetchObjectives, isLoading: loadingObjectives } = useQuery({
    queryKey: ['strategic-backlog-count', 'objectives', snapshotId, themeIds],
    queryFn: async () => {
      if (!snapshotId || themeIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  // Epics count
  const { data: epicsCount = 0, refetch: refetchEpics, isLoading: loadingEpics } = useQuery({
    queryKey: ['strategic-backlog-count', 'epics', snapshotId, themeIds],
    queryFn: async () => {
      if (!snapshotId || themeIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('epics')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!snapshotId && themeIds.length > 0,
  });

  const refetch = useCallback(() => {
    refetchThemes();
    refetchObjectives();
    refetchEpics();
  }, [refetchThemes, refetchObjectives, refetchEpics]);

  return {
    counts: {
      themes: themesCount,
      objectives: objectivesCount,
      epics: epicsCount,
    },
    isLoading: loadingThemes || loadingObjectives || loadingEpics,
    refetch,
  };
}

// Realtime subscription hook
export function useStrategicBacklogRealtime(
  snapshotId: string,
  themeIds: string[],
  onUpdate: () => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!snapshotId) return;

    // Subscribe to strategic_themes changes
    const themesChannel = supabase
      .channel(`strategic-backlog-themes-${snapshotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategic_themes',
          filter: `snapshot_id=eq.${snapshotId}`,
        },
        () => {
          // Invalidate theme queries and counts
          queryClient.invalidateQueries({ queryKey: ['strategic-backlog-list', 'themes'] });
          queryClient.invalidateQueries({ queryKey: ['strategic-backlog-count', 'themes'] });
          queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to objectives changes (only if we have theme IDs)
    let objectivesChannel: ReturnType<typeof supabase.channel> | null = null;
    if (themeIds.length > 0) {
      objectivesChannel = supabase
        .channel(`strategic-backlog-objectives-${snapshotId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'objectives',
          },
          (payload) => {
            // Check if the changed objective belongs to our themes
            const themeId = (payload.new as any)?.theme_id || (payload.old as any)?.theme_id;
            if (themeId && themeIds.includes(themeId)) {
              queryClient.invalidateQueries({ queryKey: ['strategic-backlog-list', 'objectives'] });
              queryClient.invalidateQueries({ queryKey: ['strategic-backlog-count', 'objectives'] });
              onUpdate();
            }
          }
        )
        .subscribe();
    }

    // Subscribe to epics changes (only if we have theme IDs)
    let epicsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (themeIds.length > 0) {
      epicsChannel = supabase
        .channel(`strategic-backlog-epics-${snapshotId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'epics',
          },
          (payload) => {
            // Check if the changed epic belongs to our themes
            const themeId = (payload.new as any)?.theme_id || (payload.old as any)?.theme_id;
            if (themeId && themeIds.includes(themeId)) {
              queryClient.invalidateQueries({ queryKey: ['strategic-backlog-list', 'epics'] });
              queryClient.invalidateQueries({ queryKey: ['strategic-backlog-count', 'epics'] });
              onUpdate();
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(themesChannel);
      if (objectivesChannel) supabase.removeChannel(objectivesChannel);
      if (epicsChannel) supabase.removeChannel(epicsChannel);
    };
  }, [snapshotId, themeIds.join(','), queryClient, onUpdate]);
}

// Additional data hooks for related counts (objectives per theme, KRs per objective, etc.)
export function useThemeObjectiveCounts(themeIds: string[]) {
  return useQuery({
    queryKey: ['theme-objective-counts', themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return {};
      const { data } = await supabase
        .from('objectives')
        .select('theme_id')
        .in('theme_id', themeIds);
      
      const counts: Record<string, number> = {};
      themeIds.forEach(id => counts[id] = 0);
      (data || []).forEach(obj => {
        if (obj.theme_id) counts[obj.theme_id] = (counts[obj.theme_id] || 0) + 1;
      });
      return counts;
    },
    enabled: themeIds.length > 0,
  });
}

export function useObjectiveKrCounts(objectiveIds: string[]) {
  return useQuery({
    queryKey: ['objective-kr-counts', objectiveIds],
    queryFn: async () => {
      if (objectiveIds.length === 0) return {};
      const { data } = await supabase
        .from('key_results')
        .select('objective_id')
        .in('objective_id', objectiveIds);
      
      const counts: Record<string, number> = {};
      objectiveIds.forEach(id => counts[id] = 0);
      (data || []).forEach(kr => {
        if (kr.objective_id) counts[kr.objective_id] = (counts[kr.objective_id] || 0) + 1;
      });
      return counts;
    },
    enabled: objectiveIds.length > 0,
  });
}

export function useEpicFeatureCounts(epicIds: string[]) {
  return useQuery({
    queryKey: ['epic-feature-counts', epicIds],
    queryFn: async () => {
      if (epicIds.length === 0) return {};
      const { data } = await supabase
        .from('features')
        .select('epic_id')
        .in('epic_id', epicIds);
      
      const counts: Record<string, number> = {};
      epicIds.forEach(id => counts[id] = 0);
      (data || []).forEach(f => {
        if (f.epic_id) counts[f.epic_id] = (counts[f.epic_id] || 0) + 1;
      });
      return counts;
    },
    enabled: epicIds.length > 0,
  });
}
