// =====================================================
// BOARD SERVICE
// API for Board View operations
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  WorkflowStatus, 
  WORKFLOW_STATUSES, 
  FeatureWithDetails,
  Priority 
} from '@/types/views';
import { getBatchDependencyCounts } from './dependencyService';

export interface BoardColumn {
  status: WorkflowStatus;
  features: FeatureWithDetails[];
  wipLimit?: number;
  isOverLimit: boolean;
}

export interface BoardFilters {
  releases?: string[];
  assignees?: string[];
  priorities?: Priority[];
  search?: string;
  onlyMine?: boolean;
  onlyBlocked?: boolean;
}

// -----------------------------------------------------
// Get Board Data
// -----------------------------------------------------
export async function getBoardData(
  projectId: string,
  filters?: BoardFilters
): Promise<BoardColumn[]> {
  // Get current user for "my items" filter
  const { data: user } = await supabase.auth.getUser();

  // Build query - adapt to actual schema
  // features table has: id, display_id, name, workflow_status, priority, release_id, assignee_id, project_id
  let query = supabase
    .from('features')
    .select(`
      id,
      display_id,
      name,
      description,
      workflow_status,
      priority,
      release_id,
      assignee_id,
      planned_start_date,
      planned_end_date,
      releases:release_id (
        id,
        name,
        target_date
      ),
      assignee:assignee_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null);

  // Apply filters
  if (filters?.releases?.length) {
    query = query.in('release_id', filters.releases);
  }
  if (filters?.assignees?.length) {
    query = query.in('assignee_id', filters.assignees);
  }
  if (filters?.priorities?.length) {
    query = query.in('priority', filters.priorities);
  }
  if (filters?.search) {
    query = query.or(`display_id.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
  }
  if (filters?.onlyMine && user.user) {
    // Filter where user is assignee OR reporter (created_by for features)
    query = query.or(`assignee_id.eq.${user.user.id},created_by.eq.${user.user.id}`);
  }

  const { data: features, error } = await query;
  if (error) throw error;

  // Get story counts for each feature
  const featureIds = (features || []).map(f => f.id);
  const { data: storyCounts } = await supabase
    .from('stories')
    .select('feature_id, status')
    .in('feature_id', featureIds.length > 0 ? featureIds : ['00000000-0000-0000-0000-000000000000']);

  // Get dependency counts
  const dependencyCounts = await getBatchDependencyCounts(
    (features || []).map(f => ({ type: 'feature' as const, id: f.id }))
  );

  // Get WIP limits from project
  const { data: project } = await supabase
    .from('projects')
    .select('wip_limits')
    .eq('id', projectId)
    .single();

  const wipLimits = (project?.wip_limits as Record<string, number>) || {};

  // Build columns
  const columns: BoardColumn[] = WORKFLOW_STATUSES.map(status => {
    const columnFeatures = (features || [])
      .filter(f => (f.workflow_status || 'backlog') === status)
      .map(f => {
        const featureStories = (storyCounts || []).filter(s => s.feature_id === f.id);
        const completedStories = featureStories.filter(
          s => s.status === 'done' || (s.status as string) === 'in_production'
        );
        const depCounts = dependencyCounts.get(`feature:${f.id}`) || { blocks: 0, blocked_by: 0, total: 0 };

        // Map database fields to FeatureWithDetails interface
        const release = f.releases ? {
          id: (f.releases as any).id,
          version: (f.releases as any).name,
          name: (f.releases as any).name,
          target_date: (f.releases as any).target_date
        } : undefined;

        const assignee = f.assignee ? {
          id: (f.assignee as any).id,
          full_name: (f.assignee as any).full_name,
          avatar_url: (f.assignee as any).avatar_url
        } : undefined;

        return {
          id: f.id,
          feature_id: f.display_id || f.id.slice(0, 8),
          title: f.name,
          description: f.description,
          workflow_status: (f.workflow_status || 'backlog') as WorkflowStatus,
          priority: (f.priority || 'medium') as Priority,
          release_id: f.release_id,
          release,
          assignee_id: f.assignee_id,
          assignee,
          planned_start_date: f.planned_start_date,
          planned_end_date: f.planned_end_date,
          actual_start_date: null,
          actual_end_date: null,
          story_count: featureStories.length,
          completed_story_count: completedStories.length,
          total_story_points: 0,
          completed_story_points: 0,
          dependency_counts: {
            blocks: depCounts.blocks,
            blocked_by: depCounts.blocked_by
          },
          progress_percentage: featureStories.length > 0
            ? Math.round((completedStories.length / featureStories.length) * 100)
            : 0
        } as FeatureWithDetails;
      });

    // Filter blocked items if requested
    let filteredFeatures = columnFeatures;
    if (filters?.onlyBlocked) {
      filteredFeatures = columnFeatures.filter(f => f.dependency_counts.blocked_by > 0);
    }

    const wipLimit = wipLimits[status];
    
    return {
      status,
      features: filteredFeatures,
      wipLimit,
      isOverLimit: wipLimit ? filteredFeatures.length > wipLimit : false
    };
  });

  return columns;
}

// -----------------------------------------------------
// Move Feature (update status)
// -----------------------------------------------------
export async function moveFeature(
  featureId: string,
  newStatus: WorkflowStatus
): Promise<void> {
  const { error } = await supabase
    .from('features')
    .update({ 
      workflow_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', featureId);

  if (error) throw error;
}

// -----------------------------------------------------
// Get Board Stats
// -----------------------------------------------------
export async function getBoardStats(projectId: string): Promise<{
  total: number;
  byStatus: Record<WorkflowStatus, number>;
  blocked: number;
}> {
  const { data: features } = await supabase
    .from('features')
    .select('id, workflow_status')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  // Get blocked count
  const { data: blockedItems } = await supabase
    .from('work_item_dependencies')
    .select('dependent_id')
    .eq('dependent_type', 'feature')
    .eq('is_resolved', false);

  const blockedIds = new Set((blockedItems || []).map(b => b.dependent_id));
  const projectBlockedCount = (features || []).filter(f => blockedIds.has(f.id)).length;

  const byStatus: Record<WorkflowStatus, number> = {} as Record<WorkflowStatus, number>;
  for (const status of WORKFLOW_STATUSES) {
    byStatus[status] = (features || []).filter(f => (f.workflow_status || 'backlog') === status).length;
  }

  return {
    total: (features || []).length,
    byStatus,
    blocked: projectBlockedCount
  };
}

// -----------------------------------------------------
// Get Releases for Project
// -----------------------------------------------------
export async function getReleasesForProject(projectId: string): Promise<Array<{ 
  id: string; 
  version: string; 
  name: string 
}>> {
  // Get features in this project to find which releases are used
  const { data: features } = await supabase
    .from('features')
    .select('release_id')
    .eq('project_id', projectId)
    .not('release_id', 'is', null);

  const releaseIds = [...new Set((features || []).map(f => f.release_id).filter(Boolean))];
  
  if (releaseIds.length === 0) {
    // Get all releases if no features have releases
    const { data: releases } = await supabase
      .from('releases')
      .select('id, name, target_date')
      .order('name');
    
    return (releases || []).map(r => ({
      id: r.id,
      version: r.name,
      name: r.name
    }));
  }

  const { data: releases } = await supabase
    .from('releases')
    .select('id, name, target_date')
    .in('id', releaseIds)
    .order('name');

  return (releases || []).map(r => ({
    id: r.id,
    version: r.name,
    name: r.name
  }));
}
