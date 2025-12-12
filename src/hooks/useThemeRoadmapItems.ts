// useThemeRoadmapItems - Fetches themes and transforms them into RoadmapItem format
// For Enterprise Theme Roadmap

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem } from '@/config/roadmaps/types';

interface ThemeRoadmapFilters {
  status?: string[];
  ownerIds?: string[];
  snapshotIds?: string[];
}

interface UseThemeRoadmapItemsResult {
  items: RoadmapItem[];
  isLoading: boolean;
  error: Error | null;
  snapshots: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
}

export function useThemeRoadmapItems(filters?: ThemeRoadmapFilters): UseThemeRoadmapItemsResult {
  // Fetch themes with snapshot info
  const { data: themesData, isLoading: themesLoading, error: themesError } = useQuery({
    queryKey: ['theme-roadmap-items', filters],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          color_tag,
          owner_id,
          snapshot_id,
          created_at,
          strategy_snapshots (
            id,
            name
          )
        `)
        .order('name');

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status as ('proposed' | 'active' | 'done' | 'cancelled')[]);
      }
      if (filters?.ownerIds && filters.ownerIds.length > 0) {
        query = query.in('owner_id', filters.ownerIds);
      }
      if (filters?.snapshotIds && filters.snapshotIds.length > 0) {
        query = query.in('snapshot_id', filters.snapshotIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all snapshots for filter dropdown
  const { data: snapshotsData } = useQuery({
    queryKey: ['theme-roadmap-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch owners (profiles) for filter dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['theme-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
  });

  // Transform themes into RoadmapItem format
  const items: RoadmapItem[] = (themesData || []).map((theme: any) => {
    // Start date: use start_date, fallback to created_at
    const startDate = theme.start_date || theme.created_at;
    
    // End date: use end_date, or null (will be handled as open-ended by RoadmapEngine)
    const endDate = theme.end_date || null;

    // Lane: snapshot info
    const snapshotName = theme.strategy_snapshots?.name || 'No Snapshot';
    const snapshotId = theme.snapshot_id || 'no-snapshot';

    return {
      id: theme.id,
      titleEn: theme.name,
      titleAr: theme.name, // Theme names are typically not localized
      ownerEn: snapshotName, // Using snapshot as the "owner" lane label
      ownerAr: snapshotName,
      status: theme.status || 'proposed',
      platform: snapshotId, // Using platform field to store snapshot_id for lane grouping
      rank: null, // Themes don't have rank
      startDate: startDate,
      endDate: endDate,
      milestones: [], // Themes don't show milestones
      risks: [],
      dependencies: [],
    };
  });

  return {
    items,
    isLoading: themesLoading,
    error: themesError as Error | null,
    snapshots: snapshotsData || [],
    owners: ownersData || [],
  };
}

export default useThemeRoadmapItems;
