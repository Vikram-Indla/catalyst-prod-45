/**
 * Hook for fetching Epic → Feature → Story → Subtask hierarchy
 * with team, business request, and theme badges on epics
 * Includes real-time subscriptions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, ItemStatus, Owner, Project, WorkTreeCounts } from './types';

interface UseWorkbenchDataResult {
  items: WorkItem[];
  projects: Project[];
  owners: Owner[];
  counts: WorkTreeCounts;
  overallProgress: number;
  isLoading: boolean;
  error: Error | null;
}

// Map database status to WorkItem status
function mapStatus(status: string | null): ItemStatus {
  if (!status) return 'Backlog';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'closed' || s === 'accepted') return 'Done';
  if (s === 'in progress' || s === 'implementing' || s === 'analyzing' || s === 'in_progress') return 'In Progress';
  if (s === 'blocked') return 'Blocked';
  return 'Backlog';
}

export function useWorkbenchData(
  programId: string | undefined,
  projectId: string | undefined
): UseWorkbenchDataResult {
  const queryClient = useQueryClient();

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

  // Fetch profiles
  const { data: profilesData } = useQuery({
    queryKey: ['workbench-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch teams
  const { data: teamsData } = useQuery({
    queryKey: ['workbench-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch strategic themes
  const { data: themesData } = useQuery({
    queryKey: ['workbench-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch epics scoped by program with business request join
  const { data: epicsData, isLoading: epicsLoading, error: epicsError } = useQuery({
    queryKey: ['workbench-epics', programId, projectId],
    queryFn: async () => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from('epics')
        .select(`
          id,
          epic_key,
          name,
          status,
          start_date,
          end_date,
          initiation_date,
          target_completion_date,
          owner_name,
          assignee_id,
          program_id,
          theme_id,
          linked_business_request_id,
          created_at
        `)
        .or(`program_id.eq.${programId},primary_program_id.eq.${programId}`)
        .is('deleted_at', null)
        .order('program_rank', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Get epic IDs
  const epicIds = (epicsData || []).map((e: any) => e.id);

  // Fetch business requests for epics
  const brIds = (epicsData || [])
    .map((e: any) => e.linked_business_request_id)
    .filter(Boolean);

  const { data: businessRequestsData } = useQuery({
    queryKey: ['workbench-business-requests', brIds],
    queryFn: async () => {
      if (brIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title')
        .in('id', brIds);
      if (error) throw error;
      return (data || []) as Array<{ id: string; request_key: string; title: string }>;
    },
    enabled: brIds.length > 0,
  });

  // Fetch theme-epic links
  const { data: themeLinksData } = useQuery({
    queryKey: ['workbench-theme-epic-links', epicIds],
    queryFn: async () => {
      if (epicIds.length === 0) return [];
      const { data, error } = await supabase
        .from('theme_epic_links')
        .select('epic_id, theme_id')
        .in('epic_id', epicIds);
      if (error) throw error;
      return data || [];
    },
    enabled: epicIds.length > 0,
  });

  // Fetch features for these epics
  const { data: featuresData } = useQuery({
    queryKey: ['workbench-features', epicIds, projectId],
    queryFn: async () => {
      if (epicIds.length === 0) return [];

      let query = supabase
        .from('features')
        .select(`
          id,
          display_id,
          epic_id,
          project_id,
          name,
          status,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          owner_id,
          progress_pct,
          created_at
        `)
        .in('epic_id', epicIds)
        .is('deleted_at', null);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
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
          story_key,
          feature_id,
          name,
          title,
          status,
          story_points,
          owner_id,
          progress_pct,
          created_at
        `)
        .in('feature_id', featureIds)
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: featureIds.length > 0,
  });

  // Get story IDs
  const storyIds = (storiesData || []).map((s: any) => s.id);

  // Fetch subtasks for these stories
  const { data: subtasksData } = useQuery({
    queryKey: ['workbench-subtasks', storyIds],
    queryFn: async () => {
      if (storyIds.length === 0) return [];

      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          id,
          story_id,
          name,
          status,
          assignee_id,
          created_at
        `)
        .in('story_id', storyIds);

      if (error) throw error;
      return data || [];
    },
    enabled: storyIds.length > 0,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!programId) return;

    const channel = supabase
      .channel('workbench-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epics' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workbench-epics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workbench-features'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workbench-stories'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workbench-subtasks'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [programId, queryClient]);

  // Build lookups
  const profileLookup: Record<string, Owner> = {};
  (profilesData || []).forEach((p: any) => {
    if (p.id) {
      profileLookup[p.id] = { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
    }
  });

  const teamLookup: Record<string, string> = {};
  (teamsData || []).forEach((t: any) => {
    if (t.id) teamLookup[t.id] = t.name;
  });

  const themeLookup: Record<string, { id: string; name: string }> = {};
  (themesData || []).forEach((t: any) => {
    if (t.id) themeLookup[t.id] = { id: t.id, name: t.name };
  });

  const brLookup: Record<string, { id: string; key: string; title: string }> = {};
  (businessRequestsData || []).forEach((br: any) => {
    if (br.id) brLookup[br.id] = { id: br.id, key: br.request_key || 'BR', title: br.title };
  });

  // Theme links by epic
  const themeLinksByEpic: Record<string, string> = {};
  (themeLinksData || []).forEach((link: any) => {
    if (link.epic_id && link.theme_id) {
      themeLinksByEpic[link.epic_id] = link.theme_id;
    }
  });

  // Group subtasks by story_id
  const subtasksByStoryId: Record<string, any[]> = {};
  (subtasksData || []).forEach((subtask: any) => {
    if (!subtask.story_id) return;
    if (!subtasksByStoryId[subtask.story_id]) {
      subtasksByStoryId[subtask.story_id] = [];
    }
    subtasksByStoryId[subtask.story_id].push(subtask);
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

  // Counts
  let epicCount = 0;
  let featureCount = 0;
  let storyCount = 0;
  let subtaskCount = (subtasksData || []).length;

  // Transform to WorkItem hierarchy
  const items: WorkItem[] = (epicsData || []).map((epic: any) => {
    epicCount++;
    
    // Get owner
    const owner = epic.assignee_id ? profileLookup[epic.assignee_id] : null;
    const ownerName = epic.owner_name;
    const ownerObj: Owner | null = owner || (ownerName ? { id: '', full_name: ownerName } : null);

    const startDate = epic.start_date || epic.initiation_date || null;
    const endDate = epic.target_completion_date || epic.end_date || null;

    // Get theme (from direct link or theme_epic_links)
    const themeId = epic.theme_id || themeLinksByEpic[epic.id];
    const theme = themeId ? themeLookup[themeId] : null;

    // Get business request
    const businessRequest = epic.linked_business_request_id 
      ? brLookup[epic.linked_business_request_id] 
      : null;

    // Build feature children with their story children
    const epicFeatures = featuresByEpicId[epic.id] || [];
    const featureItems: WorkItem[] = epicFeatures.map((feature: any) => {
      featureCount++;
      
      const featureOwner = feature.owner_id ? profileLookup[feature.owner_id] : null;
      const featureStart = feature.planned_start_date || feature.actual_start_date || null;
      const featureEnd = feature.planned_end_date || feature.actual_end_date || null;

      // Build story children
      const featureStories = storiesByFeatureId[feature.id] || [];
      const storyItems: WorkItem[] = featureStories.map((story: any) => {
        storyCount++;
        
        const storyOwner = story.owner_id ? profileLookup[story.owner_id] : null;
        const storyTitle = story.title || story.name || 'Untitled Story';
        const storyProgress = story.progress_pct || (mapStatus(story.status) === 'Done' ? 100 : 0);

        // Build subtask children
        const storySubtasks = subtasksByStoryId[story.id] || [];
        const subtaskItems: WorkItem[] = storySubtasks.map((subtask: any) => {
          const subtaskOwner = subtask.assignee_id ? profileLookup[subtask.assignee_id] : null;
          return {
            id: subtask.id,
            key: `TSK-${subtask.id.slice(0, 4).toUpperCase()}`,
            title: subtask.name || 'Untitled Subtask',
            type: 'subtask' as const,
            status: mapStatus(subtask.status),
            owner: subtaskOwner,
            progress: mapStatus(subtask.status) === 'Done' ? 100 : 0,
            dependencyCount: 0,
            parentId: story.id,
          };
        });

        return {
          id: story.id,
          key: story.story_key || `STR-${story.id.slice(0, 4).toUpperCase()}`,
          title: storyTitle,
          type: 'story' as const,
          status: mapStatus(story.status),
          owner: storyOwner,
          progress: storyProgress,
          dependencyCount: 0,
          parentId: feature.id,
          children: subtaskItems.length > 0 ? subtaskItems : undefined,
        };
      });

      // Calculate feature progress
      const doneStories = storyItems.filter(s => s.status === 'Done').length;
      const featureProgress = feature.progress_pct 
        || (storyItems.length > 0 ? Math.round((doneStories / storyItems.length) * 100) : 0);

      return {
        id: feature.id,
        key: feature.display_id || `FTR-${feature.id.slice(0, 4).toUpperCase()}`,
        title: feature.name || 'Untitled Feature',
        type: 'feature' as const,
        status: mapStatus(feature.status),
        owner: featureOwner,
        startDate: featureStart,
        endDate: featureEnd,
        progress: featureProgress,
        parentId: epic.id,
        dependencyCount: 0,
        children: storyItems.length > 0 ? storyItems : undefined,
      };
    });

    // Calculate epic progress
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
      owner: ownerObj,
      startDate,
      endDate,
      progress: epicProgress,
      projectId: projectId || undefined,
      projectName: projectsData?.find(p => p.id === projectId)?.name,
      dependencyCount: 0,
      team: null, // Epics don't have direct team_id - would need additional query
      businessRequest,
      theme,
      children: featureItems.length > 0 ? featureItems : undefined,
    };
  });

  // Calculate overall progress
  const totalEpicProgress = items.reduce((sum, e) => sum + e.progress, 0);
  const overallProgress = items.length > 0 ? Math.round(totalEpicProgress / items.length) : 0;

  // Collect unique owners
  const allOwners = Object.values(profileLookup);

  return {
    items,
    projects: projectsData || [],
    owners: allOwners,
    counts: {
      epics: epicCount,
      features: featureCount,
      stories: storyCount,
      subtasks: subtaskCount,
    },
    overallProgress,
    isLoading: projectsLoading || epicsLoading,
    error: epicsError as Error | null,
  };
}
