/**
 * Defects Service - Supabase CRUD Operations
 * Direct database access aligned with existing schema
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  Defect,
  DefectComment,
  DefectAttachment,
  DefectAuditLog,
  DefectWorkItemLink,
  DefectColumnPreferences,
  CreateDefectInput,
  UpdateDefectInput,
  CreateDefectCommentInput,
  UpdateDefectCommentInput,
  CreateDefectLinkInput,
  DefectFilters,
  DefectPaginationParams,
  PaginatedDefectsResponse,
  DefectStats,
  BulkDefectUpdate,
  BulkOperationResult,
  DefectSeverity,
  DefectPriority,
} from '../types/defects';

// ══════════════════════════════════════════════════════════════════════════════
// DEFECT CRUD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch defects with filters, pagination, and sorting
 */
export async function fetchDefects(
  filters: DefectFilters,
  pagination: DefectPaginationParams
): Promise<PaginatedDefectsResponse> {
  const { page, limit, sort } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('defects')
    .select(`
      *,
      assignee:profiles!defects_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!defects_reporter_id_fkey(id, full_name, avatar_url)
    `, { count: 'exact' })
    .eq('project_id', filters.project_id);

  // Apply filters
  if (filters.workflow_status?.length) {
    query = query.in('workflow_status', filters.workflow_status);
  }
  if (filters.severity?.length) {
    query = query.in('severity', filters.severity);
  }
  if (filters.priority?.length) {
    query = query.in('priority', filters.priority);
  }
  if (filters.assignee_id !== undefined) {
    if (filters.assignee_id === null) {
      query = query.is('assignee_id', null);
    } else {
      query = query.eq('assignee_id', filters.assignee_id);
    }
  }
  if (filters.reporter_id) {
    query = query.eq('reporter_id', filters.reporter_id);
  }
  if (filters.environment) {
    query = query.eq('environment', filters.environment);
  }
  if (filters.test_case_id) {
    query = query.eq('test_case_id', filters.test_case_id);
  }
  if (filters.test_run_id) {
    query = query.eq('test_run_id', filters.test_run_id);
  }
  if (filters.tags?.length) {
    query = query.overlaps('tags', filters.tags);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,defect_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters.created_after) {
    query = query.gte('created_at', filters.created_after);
  }
  if (filters.created_before) {
    query = query.lte('created_at', filters.created_before);
  }
  if (filters.due_before) {
    query = query.lte('due_date', filters.due_before);
  }

  // Apply sorting
  if (sort) {
    const ascending = sort.direction === 'asc';
    if (sort.field === 'age') {
      query = query.order('created_at', { ascending: !ascending });
    } else {
      query = query.order(sort.field as string, { ascending });
    }
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as unknown as Defect[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Fetch a single defect by ID
 */
export async function fetchDefectById(id: string): Promise<Defect> {
  const { data, error } = await supabase
    .from('defects')
    .select(`
      *,
      assignee:profiles!defects_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!defects_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as Defect;
}

/**
 * Fetch a defect by its key (e.g., DEF-123)
 */
export async function fetchDefectByKey(key: string, projectId: string): Promise<Defect> {
  const { data, error } = await supabase
    .from('defects')
    .select(`
      *,
      assignee:profiles!defects_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!defects_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .eq('defect_key', key)
    .eq('project_id', projectId)
    .single();

  if (error) throw error;
  return data as unknown as Defect;
}

/**
 * Generate a unique defect ID using year-based sequence
 */
async function generateDefectId(): Promise<{ defect_id: string; defect_key: string }> {
  const currentYear = new Date().getFullYear();
  
  // Get current sequence for this year
  const { data: seqData, error: seqError } = await supabase
    .from('defect_id_sequences')
    .select('last_sequence')
    .eq('year', currentYear)
    .single();

  let nextVal = 1;
  
  if (seqError && seqError.code === 'PGRST116') {
    // No sequence exists for this year, create one
    await supabase.from('defect_id_sequences').insert({
      year: currentYear,
      last_sequence: 1,
    });
  } else if (seqData) {
    nextVal = (seqData.last_sequence || 0) + 1;
    await supabase
      .from('defect_id_sequences')
      .update({ last_sequence: nextVal })
      .eq('year', currentYear);
  }

  const defect_key = `DEF-${currentYear}-${String(nextVal).padStart(4, '0')}`;
  return { defect_id: defect_key, defect_key };
}

/**
 * Create a new defect
 */
export async function createDefect(input: CreateDefectInput, reporterId: string): Promise<Defect> {
  const { defect_id, defect_key } = await generateDefectId();

  const insertData = {
    defect_id,
    defect_key,
    project_id: input.project_id,
    title: input.title,
    description: input.description ?? null,
    expected_result: input.expected_result,
    actual_result: input.actual_result,
    severity: input.severity || 'major',
    priority: input.priority || 'P3',
    workflow_status: input.workflow_status || 'new',
    environment: input.environment ?? null,
    environment_details: (input.environment_details ?? null) as Json,
    preconditions: input.preconditions ?? null,
    steps_to_reproduce: (input.steps_to_reproduce ?? null) as Json,
    assignee_id: input.assignee_id ?? null,
    reporter_id: reporterId,
    reported_by: reporterId,
    test_case_id: input.test_case_id ?? null,
    test_run_id: input.test_run_id ?? null,
    step_number: input.step_number ?? null,
    linked_story_id: input.linked_story_id ?? null,
    linked_feature_id: input.linked_feature_id ?? null,
    tags: input.tags || [],
    due_date: input.due_date ?? null,
    external_id: input.external_id ?? null,
    external_url: input.external_url ?? null,
  };

  const { data, error } = await supabase
    .from('defects')
    .insert(insertData)
    .select(`
      *,
      assignee:profiles!defects_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!defects_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as unknown as Defect;
}

/**
 * Update an existing defect
 */
export async function updateDefect(input: UpdateDefectInput, userId: string): Promise<Defect> {
  const { id, ...rawUpdates } = input;

  // Fetch current defect for history tracking
  const { data: current } = await supabase
    .from('defects')
    .select('*')
    .eq('id', id)
    .single();

  // Transform updates to match DB schema
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (key === 'environment_details' || key === 'steps_to_reproduce') {
      updates[key] = value as Json;
    } else {
      updates[key] = value;
    }
  }

  // Update the defect
  const { data, error } = await supabase
    .from('defects')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      assignee:profiles!defects_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!defects_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Record audit log for changed fields
  if (current) {
    const auditEntries: Array<{
      defect_id: string;
      action: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      actor_id: string;
    }> = [];

    for (const [key, newValue] of Object.entries(rawUpdates)) {
      const oldValue = (current as Record<string, unknown>)[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        auditEntries.push({
          defect_id: id,
          action: 'field_change',
          field_name: key,
          old_value: oldValue != null ? String(oldValue) : null,
          new_value: newValue != null ? String(newValue) : null,
          actor_id: userId,
        });
      }
    }

    if (auditEntries.length > 0) {
      await supabase.from('defect_audit_log').insert(auditEntries);
    }
  }

  return data as unknown as Defect;
}

/**
 * Delete a defect
 */
export async function deleteDefect(id: string): Promise<void> {
  const { error } = await supabase
    .from('defects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Bulk update defects
 */
export async function bulkUpdateDefects(
  input: BulkDefectUpdate,
  userId: string
): Promise<BulkOperationResult> {
  const { ids, changes } = input;
  const failedIds: string[] = [];
  let updatedCount = 0;

  for (const id of ids) {
    try {
      await updateDefect({ id, ...changes }, userId);
      updatedCount++;
    } catch {
      failedIds.push(id);
    }
  }

  return {
    success: failedIds.length === 0,
    updated_count: updatedCount,
    failed_ids: failedIds,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch comments for a defect
 */
export async function fetchDefectComments(defectId: string): Promise<DefectComment[]> {
  const { data, error } = await supabase
    .from('defect_comments')
    .select(`
      *,
      author:profiles!defect_comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .eq('defect_id', defectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as DefectComment[];
}

/**
 * Create a comment
 */
export async function createDefectComment(
  input: CreateDefectCommentInput,
  authorId: string
): Promise<DefectComment> {
  const { data, error } = await supabase
    .from('defect_comments')
    .insert({
      defect_id: input.defect_id,
      content: input.content,
      is_internal: input.is_internal ?? false,
      author_id: authorId,
    })
    .select(`
      *,
      author:profiles!defect_comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as unknown as DefectComment;
}

/**
 * Update a comment
 */
export async function updateDefectComment(input: UpdateDefectCommentInput): Promise<DefectComment> {
  const { id, content } = input;

  const { data, error } = await supabase
    .from('defect_comments')
    .update({ content })
    .eq('id', id)
    .select(`
      *,
      author:profiles!defect_comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as unknown as DefectComment;
}

/**
 * Delete a comment
 */
export async function deleteDefectComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('defect_comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch attachments for a defect
 */
export async function fetchDefectAttachments(defectId: string): Promise<DefectAttachment[]> {
  const { data, error } = await supabase
    .from('defect_attachments')
    .select(`
      *,
      uploader:profiles!defect_attachments_uploaded_by_fkey(id, full_name, avatar_url)
    `)
    .eq('defect_id', defectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as DefectAttachment[];
}

/**
 * Delete an attachment
 */
export async function deleteDefectAttachment(id: string): Promise<void> {
  const { error } = await supabase
    .from('defect_attachments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG (HISTORY)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch audit log for a defect
 */
export async function fetchDefectAuditLog(defectId: string): Promise<DefectAuditLog[]> {
  const { data, error } = await supabase
    .from('defect_audit_log')
    .select(`
      *,
      user:profiles!defect_audit_log_actor_id_fkey(id, full_name, avatar_url)
    `)
    .eq('defect_id', defectId)
    .order('acted_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as DefectAuditLog[];
}

// ══════════════════════════════════════════════════════════════════════════════
// WORK ITEM LINKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch work item links for a defect
 */
export async function fetchDefectWorkItemLinks(defectId: string): Promise<DefectWorkItemLink[]> {
  const { data, error } = await supabase
    .from('defect_work_item_links')
    .select('*')
    .eq('defect_id', defectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as DefectWorkItemLink[];
}

/**
 * Create a work item link
 */
export async function createDefectWorkItemLink(
  input: CreateDefectLinkInput,
  userId: string
): Promise<DefectWorkItemLink> {
  const { data, error } = await supabase
    .from('defect_work_item_links')
    .insert({
      defect_id: input.defect_id,
      linked_item_type: input.work_item_type,
      linked_item_id: input.work_item_id,
      relationship_type: input.link_type,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as DefectWorkItemLink;
}

/**
 * Delete a work item link
 */
export async function deleteDefectWorkItemLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('defect_work_item_links')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch defect statistics for a project
 */
export async function fetchDefectStats(projectId: string): Promise<DefectStats> {
  const { data, error } = await supabase
    .from('defects')
    .select('id, workflow_status, severity, priority, created_at')
    .eq('project_id', projectId);

  if (error) throw error;

  const defects = data || [];
  const now = new Date();

  const by_workflow_status: Record<string, number> = {};
  const by_severity: Record<DefectSeverity, number> = {
    blocker: 0,
    critical: 0,
    major: 0,
    minor: 0,
    trivial: 0,
  };
  const by_priority: Record<DefectPriority, number> = {
    P1: 0,
    P2: 0,
    P3: 0,
    P4: 0,
    P5: 0,
  };

  let totalAgeDays = 0;
  let oldestOpenDays = 0;
  let openCount = 0;
  let resolvedCount = 0;

  const openStatuses = ['new', 'open', 'in_progress', 'in_review', 'reopened'];
  const resolvedStatuses = ['resolved', 'closed'];

  for (const defect of defects) {
    const status = defect.workflow_status;
    by_workflow_status[status] = (by_workflow_status[status] || 0) + 1;
    
    if (by_severity[defect.severity as DefectSeverity] !== undefined) {
      by_severity[defect.severity as DefectSeverity]++;
    }
    if (by_priority[defect.priority as DefectPriority] !== undefined) {
      by_priority[defect.priority as DefectPriority]++;
    }

    const createdAt = new Date(defect.created_at || now);
    const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (openStatuses.includes(status)) {
      openCount++;
      totalAgeDays += ageDays;
      if (ageDays > oldestOpenDays) {
        oldestOpenDays = ageDays;
      }
    }
    if (resolvedStatuses.includes(status)) {
      resolvedCount++;
    }
  }

  return {
    total: defects.length,
    by_workflow_status,
    by_severity,
    by_priority,
    open_count: openCount,
    resolved_count: resolvedCount,
    average_age_days: openCount > 0 ? Math.round(totalAgeDays / openCount) : 0,
    oldest_open_days: oldestOpenDays,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// COLUMN PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch user's column preferences
 */
export async function fetchColumnPreferences(userId: string): Promise<DefectColumnPreferences | null> {
  const { data, error } = await supabase
    .from('defect_column_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) return null;
  
  return {
    ...data,
    columns: Array.isArray(data.columns) ? data.columns as string[] : JSON.parse(data.columns as string),
    column_widths: typeof data.column_widths === 'object' ? data.column_widths as Record<string, number> : {},
  };
}

/**
 * Save user's column preferences
 */
export async function saveColumnPreferences(
  userId: string,
  columns: string[],
  columnWidths?: Record<string, number>
): Promise<DefectColumnPreferences> {
  const { data, error } = await supabase
    .from('defect_column_preferences')
    .upsert({
      user_id: userId,
      columns,
      column_widths: columnWidths || {},
    }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  
  return {
    ...data,
    columns: Array.isArray(data.columns) ? data.columns as string[] : JSON.parse(data.columns as string),
    column_widths: typeof data.column_widths === 'object' ? data.column_widths as Record<string, number> : {},
  };
}
