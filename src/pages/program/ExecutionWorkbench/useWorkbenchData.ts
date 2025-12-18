/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Hook for fetching Epic → Feature → Story hierarchy for Execution Workbench
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, HealthStatus, ItemStatus, Project } from './types';

interface UseWorkbenchDataResult {
  items: WorkItem[];
  projects: Project[];
  owners: string[];
  isLoading: boolean;
  error: Error | null;
}

// Map database status to WorkItem status
function mapStatus(status: string | null): ItemStatus {
  if (!status) return 'To Do';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'closed') return 'Done';
  if (s === 'in progress' || s === 'implementing' || s === 'analyzing') return 'In Progress';
  if (s === 'blocked') return 'Blocked';
  return 'To Do';
}

// Map database health to WorkItem health
function mapHealth(health: string | null): HealthStatus {
  if (!health) return 'On Track';
  const h = health.toLowerCase();
  if (h === 'red' || h === 'blocked') return 'Blocked';
  if (h === 'yellow' || h === 'at risk' || h === 'at_risk') return 'At Risk';
  return 'On Track';
}

// Get initials from name
function getInitials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function useWorkbenchData(
  programId: string | undefined,
  projectId: string | undefined
): UseWorkbenchDataResult {
  // Fetch projects for dropdown
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['workbench-projects', programId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, program_id')
        .order('name');
      
      if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.name }));
    },
    enabled: true,
  });

  // Fetch epics scoped by program
  const { data: epicsData, isLoading: epicsLoading, error: epicsError } = useQuery({
    queryKey: ['workbench-epics', programId, projectId],
    queryFn: async () => {
      if (!programId) return [];

      let query = supabase
        .from('epics')
        .select(`
          id,
          epic_key,
          name,
          status,
          health,
          start_date,
          end_date,
          initiation_date,
          target_completion_date,
          owner_name,
          owner_id,
          primary_program_id,
          created_at
        `)
        .eq('primary_program_id', programId)
        .is('deleted_at', null)
        .order('program_rank', { ascending: true, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Get epic IDs
  const epicIds = (epicsData || []).map((e: any) => e.id);

  // Fetch features for these epics
  const { data: featuresData } = useQuery({
    queryKey: ['workbench-features', epicIds],
    queryFn: async () => {
      if (epicIds.length === 0) return [];

      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          epic_id,
          name,
          status,
          health,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          owner_id,
          created_at
        `)
        .in('epic_id', epicIds);

      if (error) throw error;
      return data || [];
    },
    enabled: epicIds.length > 0,
  });

  // Get feature IDs
  const featureIds = (featuresData || []).map((f: any) => f.id);

  // Fetch stories for these features
  const { data: storiesData } = useQuery({
    queryKey: ['workbench-stories', featureIds],
    queryFn: async () => {
      if (featureIds.length === 0) return [];

      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          feature_id,
          name,
          status,
          points,
          owner_id,
          created_at
        `)
        .in('feature_id', featureIds);

      if (error) throw error;
      return data || [];
    },
    enabled: featureIds.length > 0,
  });

  // Fetch owner profiles
  const { data: profilesData } = useQuery({
    queryKey: ['workbench-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Build owner lookup
  const ownerLookup: Record<string, string> = {};
  (profilesData || []).forEach((p: any) => {
    if (p.id && p.full_name) {
      ownerLookup[p.id] = p.full_name;
    }
  });

  // Group stories by feature_id
  const storiesByFeatureId: Record<string, any[]> = {};
  (storiesData || []).forEach((story: any) => {
    if (!story.feature_id) return;
    if (!storiesByFeatureId[story.feature_id]) {
      storiesByFeatureId[story.feature_id] = [];
    }
    storiesByFeatureId[story.feature_id].push(story);
  });

  // Group features by epic_id
  const featuresByEpicId: Record<string, any[]> = {};
  (featuresData || []).forEach((feature: any) => {
    if (!feature.epic_id) return;
    if (!featuresByEpicId[feature.epic_id]) {
      featuresByEpicId[feature.epic_id] = [];
    }
    featuresByEpicId[feature.epic_id].push(feature);
  });

  // Transform to WorkItem hierarchy
  const items: WorkItem[] = (epicsData || []).map((epic: any) => {
    const ownerName = epic.owner_name || ownerLookup[epic.owner_id] || null;
    const startDate = epic.start_date || epic.initiation_date || null;
    const endDate = epic.target_completion_date || epic.end_date || null;

    // Build feature children with their story children
    const epicFeatures = featuresByEpicId[epic.id] || [];
    const featureItems: WorkItem[] = epicFeatures.map((feature: any) => {
      const featureOwner = ownerLookup[feature.owner_id] || null;
      const featureStart = feature.planned_start_date || feature.actual_start_date || null;
      const featureEnd = feature.planned_end_date || feature.actual_end_date || null;

      // Build story children
      const featureStories = storiesByFeatureId[feature.id] || [];
      const storyItems: WorkItem[] = featureStories.map((story: any) => {
        const storyOwner = ownerLookup[story.owner_id] || null;
        return {
          id: story.id,
          key: `STR-${story.id.slice(0, 4).toUpperCase()}`,
          title: story.name || 'Untitled Story',
          type: 'story' as const,
          status: mapStatus(story.status),
          health: 'On Track' as HealthStatus, // Stories typically don't have health
          owner: storyOwner,
          ownerInitials: getInitials(storyOwner),
          progress: story.status?.toLowerCase() === 'done' ? 100 : 0,
          dependencyCount: 0, // TODO: wire to real dependency data when available
        };
      });

      // Calculate feature progress from stories
      const doneStories = storyItems.filter(s => s.status === 'Done').length;
      const featureProgress = storyItems.length > 0 
        ? Math.round((doneStories / storyItems.length) * 100) 
        : 0;

      return {
        id: feature.id,
        key: `FTR-${feature.id.slice(0, 4).toUpperCase()}`,
        title: feature.name || 'Untitled Feature',
        type: 'feature' as const,
        status: mapStatus(feature.status),
        health: mapHealth(feature.health),
        owner: featureOwner,
        ownerInitials: getInitials(featureOwner),
        startDate: featureStart,
        endDate: featureEnd,
        progress: featureProgress,
        parentId: epic.id,
        dependencyCount: 0, // TODO: wire to real dependency data when available
        children: storyItems.length > 0 ? storyItems : undefined,
      };
    });

    // Calculate epic progress from features
    const totalProgress = featureItems.reduce((sum, f) => sum + f.progress, 0);
    const epicProgress = featureItems.length > 0 
      ? Math.round(totalProgress / featureItems.length) 
      : 0;

    return {
      id: epic.id,
      key: epic.epic_key || `EPC-${epic.id.slice(0, 4).toUpperCase()}`,
      title: epic.name || 'Untitled Epic',
      type: 'epic' as const,
      status: mapStatus(epic.status),
      health: mapHealth(epic.health),
      owner: ownerName,
      ownerInitials: getInitials(ownerName),
      startDate,
      endDate,
      progress: epicProgress,
      projectId: projectId || undefined,
      projectName: projectsData?.find(p => p.id === projectId)?.name,
      dependencyCount: 0, // TODO: wire to real dependency data when available
      children: featureItems.length > 0 ? featureItems : undefined,
    };
  });

  // Collect unique owner names
  const ownerSet = new Set<string>();
  items.forEach(epic => {
    if (epic.owner) ownerSet.add(epic.owner);
    epic.children?.forEach(feature => {
      if (feature.owner) ownerSet.add(feature.owner);
      feature.children?.forEach(story => {
        if (story.owner) ownerSet.add(story.owner);
      });
    });
  });

  return {
    items,
    projects: projectsData || [],
    owners: Array.from(ownerSet).sort(),
    isLoading: projectsLoading || epicsLoading,
    error: epicsError as Error | null,
  };
}
