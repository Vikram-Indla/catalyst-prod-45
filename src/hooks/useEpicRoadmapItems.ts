// useEpicRoadmapItems - Fetches epics and transforms them into RoadmapItem format
// For Program Epic Roadmap

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem } from '@/config/roadmaps/types';

interface EpicRoadmapFilters {
  status?: string[];
  ownerIds?: string[];
  themeIds?: string[];
  health?: string[];
}

interface UseEpicRoadmapItemsResult {
  items: RoadmapItem[];
  isLoading: boolean;
  error: Error | null;
  themes: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
}

// Feature status to milestone state mapping
const FEATURE_STATUS_TO_MILESTONE_STATE: Record<string, 'complete' | 'current' | 'pending'> = {
  'done': 'complete',
  'implementing': 'current',
  'analyzing': 'current',
  'backlog': 'pending',
  'funnel': 'pending',
};

export function useEpicRoadmapItems(
  programId: string | undefined,
  filters?: EpicRoadmapFilters
): UseEpicRoadmapItemsResult {
  // Fetch epics with theme info, scoped by program
  const { data: epicsData, isLoading: epicsLoading, error: epicsError } = useQuery({
    queryKey: ['epic-roadmap-items', programId, filters],
    queryFn: async () => {
      if (!programId) return [];

      let query = supabase
        .from('epics')
        .select(`
          id,
          epic_key,
          name,
          description,
          status,
          health,
          start_date,
          end_date,
          initiation_date,
          target_completion_date,
          owner_id,
          theme_id,
          program_rank,
          created_at,
          strategic_themes (
            id,
            name
          )
        `)
        .eq('primary_program_id', programId)
        .is('deleted_at', null)
        .order('program_rank', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status as any);
      }
      if (filters?.ownerIds && filters.ownerIds.length > 0) {
        query = query.in('owner_id', filters.ownerIds);
      }
      if (filters?.themeIds && filters.themeIds.length > 0) {
        query = query.in('theme_id', filters.themeIds);
      }
      if (filters?.health && filters.health.length > 0) {
        query = query.in('health', filters.health as ('green' | 'yellow' | 'red')[]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Get epic IDs for fetching features
  const epicIds = (epicsData || []).map((e: any) => e.id);

  // Fetch child features for the epics (only when we have epics)
  const { data: featuresData } = useQuery({
    queryKey: ['epic-roadmap-features', epicIds],
    queryFn: async () => {
      if (epicIds.length === 0) return [];

      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          epic_id,
          name,
          status,
          planned_end_date,
          actual_end_date,
          planned_start_date,
          actual_start_date,
          created_at
        `)
        .in('epic_id', epicIds);

      if (error) throw error;
      return data || [];
    },
    enabled: epicIds.length > 0,
  });

  // Group features by epic_id
  const featuresByEpicId = (featuresData || []).reduce((acc: Record<string, any[]>, feature: any) => {
    if (!feature.epic_id) return acc;
    if (!acc[feature.epic_id]) acc[feature.epic_id] = [];
    acc[feature.epic_id].push(feature);
    return acc;
  }, {});

  // Fetch all themes for filter dropdown
  const { data: themesData } = useQuery({
    queryKey: ['epic-roadmap-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch owners (profiles) for filter dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['epic-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.full_name || 'Unknown' }));
    },
  });

  // Transform epics into RoadmapItem format with Feature markers
  const items: RoadmapItem[] = (epicsData || []).map((epic: any) => {
    // Title: "EPIC_KEY – Name" or just "Name"
    const displayTitle = epic.epic_key 
      ? `${epic.epic_key} – ${epic.name}` 
      : epic.name;

    // Start date: start_date → initiation_date → created_at
    const startDate = epic.start_date 
      || epic.initiation_date 
      || epic.created_at;
    
    // End date: target_completion_date → end_date → null (open-ended)
    const endDate = epic.target_completion_date 
      || epic.end_date 
      || null;

    // Lane: theme info
    const themeName = epic.strategic_themes?.name || 'No Theme';
    const themeId = epic.theme_id || 'no-theme';

    // Build Feature markers (milestones) for this Epic
    const epicFeatures = featuresByEpicId[epic.id] || [];
    const milestones: RoadmapItem['milestones'] = epicFeatures
      .map((feature: any) => {
        // Determine marker date: target/end date → start date → created_at
        const markerDate = feature.planned_end_date 
          || feature.actual_end_date 
          || feature.planned_start_date
          || feature.actual_start_date
          || feature.created_at;
        
        if (!markerDate) return null;

        // Map Feature status to milestone state
        const featureStatus = feature.status || 'funnel';
        const state = FEATURE_STATUS_TO_MILESTONE_STATE[featureStatus] || 'pending';

        return {
          step: 1 as const, // Will be renumbered below
          date: markerDate,
          state,
          // Epic-specific: attach feature data for tooltips/click
          featureId: feature.id,
          featureName: feature.name,
          featureStatus,
        };
      })
      .filter(Boolean)
      // Sort by date chronologically
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      // Renumber in order (1, 2, 3...)
      .map((ms: any, index: number) => ({
        ...ms,
        step: (index + 1) as 1 | 2 | 3 | 4 | 5,
      }));

    return {
      id: epic.id,
      key: epic.epic_key || `E-${epic.id.slice(0, 4).toUpperCase()}`,
      titleEn: displayTitle,
      titleAr: displayTitle, // Epic names are typically not localized
      ownerEn: themeName, // Using theme as the "owner" lane label
      ownerAr: themeName,
      status: epic.status || 'proposed',
      platform: themeId, // Using platform field to store theme_id for lane grouping
      rank: epic.program_rank,
      startDate: startDate,
      endDate: endDate,
      milestones, // Child Features as markers
      risks: [],
      dependencies: [],
    };
  });

  return {
    items,
    isLoading: epicsLoading,
    error: epicsError as Error | null,
    themes: themesData || [],
    owners: ownersData || [],
  };
}

export default useEpicRoadmapItems;
