/**
 * Feature Backlog API — Server-side queries
 * All filtering, sorting, pagination is done server-side
 */
import { supabase } from '@/integrations/supabase/client';
import type { FeatureBacklogQueryParams, FeatureBacklogResponse, FeatureBacklogItem } from '../types';

export async function fetchFeatureBacklog(params: FeatureBacklogQueryParams): Promise<FeatureBacklogResponse> {
  const { programId, page, pageSize, search, status, priority, projectId, epicId, sortField, sortDirection } = params;

  // Build base query - Features scoped to Program via Epic relationship OR direct project relationship
  let countQuery = supabase
    .from('features')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  let dataQuery = supabase
    .from('features')
    .select(`
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
    `)
    .is('deleted_at', null);

  // Apply program scoping via project relationship (project belongs to program)
  // Get projects for this program first
  const { data: programProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('program_id', programId);

  const projectIds = programProjects?.map(p => p.id) || [];

  if (projectIds.length > 0) {
    countQuery = countQuery.in('project_id', projectIds);
    dataQuery = dataQuery.in('project_id', projectIds);
  } else {
    // No projects in program, return empty
    return { items: [], total: 0, page, pageSize };
  }

  // Apply search filter (key + summary)
  if (search) {
    const searchPattern = `%${search}%`;
    countQuery = countQuery.or(`name.ilike.${searchPattern},display_id.ilike.${searchPattern}`);
    dataQuery = dataQuery.or(`name.ilike.${searchPattern},display_id.ilike.${searchPattern}`);
  }

  // Apply status filter
  if (status) {
    countQuery = countQuery.eq('status', status as any);
    dataQuery = dataQuery.eq('status', status as any);
  }

  // Apply priority filter
  if (priority) {
    countQuery = countQuery.eq('priority', priority);
    dataQuery = dataQuery.eq('priority', priority);
  }

  // Apply project filter
  if (projectId) {
    countQuery = countQuery.eq('project_id', projectId);
    dataQuery = dataQuery.eq('project_id', projectId);
  }

  // Apply epic filter
  if (epicId === 'none') {
    countQuery = countQuery.is('epic_id', null);
    dataQuery = dataQuery.is('epic_id', null);
  } else if (epicId) {
    countQuery = countQuery.eq('epic_id', epicId);
    dataQuery = dataQuery.eq('epic_id', epicId);
  }

  // Get total count
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  // Apply sorting
  const dbSortField = mapSortField(sortField);
  dataQuery = dataQuery.order(dbSortField, { ascending: sortDirection === 'asc' });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dataQuery = dataQuery.range(from, to);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Transform to FeatureBacklogItem
  const items: FeatureBacklogItem[] = (data || []).map((f: any) => ({
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
    total: count || 0,
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
