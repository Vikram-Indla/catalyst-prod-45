// useThemeRoadmapItems - Fetches themes and transforms them into RoadmapItem format
// For Enterprise Theme Roadmap
// THEME-ONLY: This hook adds child Epic markers to Theme bars

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem } from '@/config/roadmaps/types';

interface ThemeRoadmapFilters {
  status?: string[];
  ownerIds?: string[];
  snapshotIds?: string[];
}

// Child Epic data structure for markers
interface ChildEpic {
  id: string;
  epic_key: string;
  name: string;
  status: string;
  target_completion_date: string | null;
  end_date: string | null;
  start_date: string | null;
  created_at: string;
  theme_id: string;
  owner_name: string | null;
  primary_program_id: string | null;
  programs?: { name: string } | null;
}

interface UseThemeRoadmapItemsResult {
  items: RoadmapItem[];
  isLoading: boolean;
  error: Error | null;
  snapshots: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
  // Child epic data for drawer opening
  childEpicsMap: Map<string, ChildEpic[]>;
}

// Compute marker date for an Epic
function getEpicMarkerDate(epic: ChildEpic): string | null {
  // Priority: target_completion_date → end_date → start_date → created_at
  return epic.target_completion_date || epic.end_date || epic.start_date || epic.created_at || null;
}

// Map Epic status to milestone state for consistent rendering
function getEpicMarkerState(status: string): 'complete' | 'current' | 'pending' {
  switch (status) {
    case 'done':
      return 'complete';
    case 'in_progress':
    case 'analyzing':
    case 'approved':
      return 'current';
    case 'proposed':
    case 'cancelled':
    default:
      return 'pending';
  }
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

  // Fetch child Epics for the displayed themes ONLY
  // PERFORMANCE: Only fetch epics for themes that are currently displayed
  const themeIds = (themesData || []).map((t: any) => t.id).filter(Boolean);
  
  const { data: childEpicsData } = useQuery({
    queryKey: ['theme-roadmap-child-epics', themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select(`
          id,
          epic_key,
          name,
          status,
          target_completion_date,
          end_date,
          start_date,
          created_at,
          theme_id,
          owner_name,
          primary_program_id,
          programs!primary_program_id (name)
        `)
        .in('theme_id', themeIds)
        .is('deleted_at', null)
        .order('target_completion_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return (data || []) as ChildEpic[];
    },
    enabled: themeIds.length > 0,
  });

  // Build a map: themeId → ChildEpic[]
  const childEpicsMap = new Map<string, ChildEpic[]>();
  (childEpicsData || []).forEach((epic: ChildEpic) => {
    if (!epic.theme_id) return;
    const existing = childEpicsMap.get(epic.theme_id) || [];
    existing.push(epic);
    childEpicsMap.set(epic.theme_id, existing);
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

  // Transform themes into RoadmapItem format with child Epic markers
  const items: RoadmapItem[] = (themesData || []).map((theme: any) => {
    // Start date: use start_date, fallback to created_at
    const startDate = theme.start_date || theme.created_at;
    
    // End date: use end_date, or null (will be handled as open-ended by RoadmapEngine)
    const endDate = theme.end_date || null;

    // Lane: snapshot info
    const snapshotName = theme.strategy_snapshots?.name || 'No Snapshot';
    const snapshotId = theme.snapshot_id || 'no-snapshot';

    // Get child Epics for this theme and transform to milestone format
    const themeEpics = childEpicsMap.get(theme.id) || [];
    
    // Sort epics by marker date and convert to milestone format
    const sortedEpics = [...themeEpics]
      .map(epic => ({ epic, markerDate: getEpicMarkerDate(epic) }))
      .filter(({ markerDate }) => markerDate !== null)
      .sort((a, b) => new Date(a.markerDate!).getTime() - new Date(b.markerDate!).getTime());

    // Transform to milestone format expected by RoadmapEngine
    // Use step as a numbered marker (1-5, cycling if more than 5)
    const milestones = sortedEpics.map(({ epic, markerDate }, index) => ({
      step: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      date: markerDate!,
      state: getEpicMarkerState(epic.status),
      // Extended data for Theme roadmap epic markers
      epicId: epic.id,
      epicKey: epic.epic_key,
      epicName: epic.name,
      epicStatus: epic.status,
      programName: epic.programs?.name || null,
    }));

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
      milestones: milestones,
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
    childEpicsMap,
  };
}

export default useThemeRoadmapItems;
