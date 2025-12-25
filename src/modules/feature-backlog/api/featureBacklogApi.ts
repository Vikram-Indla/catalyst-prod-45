/**
 * Feature Backlog API — Server-side queries
 * All filtering, sorting, pagination is done server-side
 * 
 * PERFORMANCE OPTIMIZATION: Uses cached project IDs to avoid sequential queries
 */
import { supabase } from '@/integrations/supabase/client';
import type { FeatureBacklogQueryParams, FeatureBacklogResponse, FeatureBacklogItem } from '../types';

// Cache for program project IDs to avoid repeated lookups
const projectIdsCache = new Map<string, { ids: string[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

async function getProgramProjectIds(programId: string): Promise<string[]> {
  const now = Date.now();
  const cached = projectIdsCache.get(programId);
  
  // Return cached value if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.ids;
  }
  
  const { data: programProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('program_id', programId);
  
  const ids = programProjects?.map(p => p.id) || [];
  projectIdsCache.set(programId, { ids, timestamp: now });
  return ids;
}

export async function fetchFeatureBacklog(params: FeatureBacklogQueryParams): Promise<FeatureBacklogResponse> {
  const { programId, page, pageSize, search, status, priority, projectId, epicId, sortField, sortDirection } = params;

  // Get project IDs (cached)
  const projectIds = await getProgramProjectIds(programId);
  
  if (projectIds.length === 0) {
    // No projects in program, return empty
    return { items: [], total: 0, page, pageSize };
  }

  // Build queries in parallel for count and data
  const buildQuery = (isCount: boolean) => {
    let query = isCount 
      ? supabase.from('features').select('id', { count: 'exact', head: true })
      : supabase.from('features').select(`
          id,
          display_id,
          name,
          status,
          priority,
          health,
          progress_pct,
          planned_start_date,
          planned_end_date,
          created_at,
          updated_at,
          project_id,
          epic_id,
          owner_id,
          assignee_id,
          change_number_id,
          projects!project_id(id, name, program_id),
          epics!epic_id(id, name, epic_key, primary_program_id),
          owner:profiles!features_owner_id_fkey(id, full_name),
          assignee:profiles!features_assignee_id_fkey(id, full_name),
          change_numbers!change_number_id(id, number)
        `);

    // Apply program scoping
    query = query.is('deleted_at', null).in('project_id', projectIds);

    // Apply search filter (key + summary)
    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(`name.ilike.${searchPattern},display_id.ilike.${searchPattern}`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status as any);
    }

    // Apply priority filter
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply project filter
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Apply epic filter
    if (epicId === 'none') {
      query = query.is('epic_id', null);
    } else if (epicId) {
      query = query.eq('epic_id', epicId);
    }

    return query;
  };

  // Execute count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    buildQuery(true),
    (() => {
      let dataQuery = buildQuery(false);
      
      // Apply sorting
      const dbSortField = mapSortField(sortField);
      dataQuery = dataQuery.order(dbSortField, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      dataQuery = dataQuery.range(from, to);
      
      return dataQuery;
    })(),
  ]);

  if (countResult.error) throw countResult.error;
  if (dataResult.error) throw dataResult.error;

  // Transform to FeatureBacklogItem
  const items: FeatureBacklogItem[] = (dataResult.data || []).map((f: any) => ({
    id: f.id,
    key: f.display_id || `FEAT-${f.id.slice(0, 6).toUpperCase()}`,
    summary: f.name,
    project_id: f.project_id,
    project_name: f.projects?.name || null,
    epic_id: f.epic_id,
    epic_name: f.epics?.name || null,
    status: f.status,
    priority: f.priority,
    assignee_id: f.assignee_id,
    assignee_name: (f.assignee as any)?.full_name || null,
    health: f.health,
    progress_pct: f.progress_pct,
    planned_start_date: f.planned_start_date,
    planned_end_date: f.planned_end_date,
    created_at: f.created_at,
    updated_at: f.updated_at,
    owner_id: f.owner_id,
    owner_name: (f.owner as any)?.full_name || null,
    change_number_id: f.change_number_id,
    change_number: (f.change_numbers as any)?.number || null,
    labels: null, // TODO: Add labels support
  }));

  return {
    items,
    total: countResult.count || 0,
    page,
    pageSize,
  };
}

function mapSortField(field: string): string {
  const mapping: Record<string, string> = {
    key: 'display_id',
    summary: 'name',
    project: 'project_id',
    epic: 'epic_id',
    status: 'status',
    priority: 'priority',
    assignee: 'assignee_id',
    updated: 'updated_at',
    created: 'created_at',
    health: 'health',
    progress: 'progress_pct',
  };
  return mapping[field] || 'updated_at';
}

// Fetch projects for a program (for filters)
export async function fetchProgramProjects(programId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('program_id', programId)
    .order('name');

  if (error) throw error;
  return data || [];
}

// Fetch epics for a program (for filters)
export async function fetchProgramEpics(programId: string) {
  const { data, error } = await supabase
    .from('epics')
    .select('id, name, epic_key')
    .eq('primary_program_id', programId)
    .order('name');

  if (error) throw error;
  return data || [];
}
