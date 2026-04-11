// ============================================================================
// HOOK: useDefects
// File: /hooks/test-management/useDefects.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TMDefect, 
  TMDefectComment,
  TMAttachment,
  DefectFilters, 
  CreateDefectInput, 
  UpdateDefectInput,
  DefectSeverity,
  DefectStatus 
} from '@/types/test-management';
import { toast } from 'sonner';

// DB uses lowercase enums - match the actual DB enum values
type DbDefectSeverity = 'critical' | 'major' | 'minor' | 'trivial';
type DbDefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

const severityToDb = (severity: DefectSeverity): DbDefectSeverity => {
  return severity.toLowerCase() as DbDefectSeverity;
};

const severityFromDb = (severity: string | null): DefectSeverity => {
  return (severity?.toUpperCase() || 'MINOR') as DefectSeverity;
};

const statusToDb = (status: DefectStatus): DbDefectStatus => {
  const map: Record<DefectStatus, DbDefectStatus> = {
    'OPEN': 'open',
    'IN_PROGRESS': 'in_progress',
    'FIXED': 'resolved',
    'VERIFIED': 'closed',
    'CLOSED': 'closed',
    'WONT_FIX': 'closed',
    'DUPLICATE': 'closed',
  };
  return map[status] || 'open';
};

const statusFromDb = (status: string | null): DefectStatus => {
  const map: Record<string, DefectStatus> = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'resolved': 'FIXED',
    'verified': 'VERIFIED',
    'closed': 'CLOSED',
    'wont_fix': 'WONT_FIX',
    'duplicate': 'DUPLICATE',
  };
  return map[status || 'open'] || 'OPEN';
};

// Helper to map DB row to TMDefect
function mapDbRowToTMDefect(row: any): TMDefect {
  return {
    id: row.id,
    project_id: row.project_id,
    key: row.defect_key,
    title: row.title,
    description: row.description || undefined,
    severity: severityFromDb(row.severity),
    status: statusFromDb(row.status),
    assigned_to: row.assignee_id,
    reported_by: row.reporter_id || '',
    external_id: row.external_id || undefined,
    external_url: row.external_url || undefined,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    jira_key: row.jira_key || null,
    jira_source: row.jira_source || false,
    jira_project_key: row.jira_project_key || null,
    jira_status: row.jira_status || null,
    jira_status_category: row.jira_status_category || null,
    jira_assignee_name: row.jira_assignee_name || null,
    jira_reporter_name: row.jira_reporter_name || null,
    assignee: row.assignee,
    reporter: row.reporter,
  };
}

// ============================================================================
// GENERATE DEFECT KEY
// ============================================================================

async function generateDefectKey(projectId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('tm_next_entity_key', {
      p_prefix: 'DEF',
      p_project_id: projectId,
    });
    if (!error && data) return data;
  } catch {
    // Fallback below
  }

  // Fallback
  const { count } = await supabase
    .from('tm_defects')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const nextNum = (count || 0) + 1;
  return `DEF-${String(nextNum).padStart(3, '0')}`;
}

// ============================================================================
// FETCH DEFECTS (with filters)
// ============================================================================

export function useDefects(
  projectId: string | undefined,
  filters?: DefectFilters,
  page: number = 1,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ['tm-defects', projectId, filters, page, pageSize],
    queryFn: async (): Promise<{ data: TMDefect[]; total: number }> => {
      if (!projectId) return { data: [], total: 0 };

      let query = supabase
        .from('tm_defects')
        .select(`
          *,
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          const dbStatuses = filters.status.map(s => statusToDb(s));
          query = query.in('status', dbStatuses);
        } else {
          query = query.eq('status', statusToDb(filters.status));
        }
      }

      if (filters?.severity) {
        if (Array.isArray(filters.severity)) {
          const dbSeverities = filters.severity.map(s => severityToDb(s));
          query = query.in('severity', dbSeverities);
        } else {
          query = query.eq('severity', severityToDb(filters.severity));
        }
      }

      if (filters?.assigned_to) {
        if (filters.assigned_to === 'unassigned') {
          query = query.is('assignee_id', null);
        } else {
          query = query.eq('assignee_id', filters.assigned_to);
        }
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,defect_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%,jira_key.ilike.%${filters.search}%`);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching defects:', error);
        throw error;
      }

      return { data: (data || []).map(mapDbRowToTMDefect), total: count || 0 };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// FETCH DEFECT STATS
// ============================================================================

export function useDefectStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-defect-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data: rpcData, error } = await supabase.rpc('get_defect_stats', { p_project_id: projectId });

      if (error) throw error;

      const data = rpcData as any;

      return {
        total: data.total || 0,
        by_status: {
          OPEN: data.open || 0,
          IN_PROGRESS: data.in_progress || 0,
          FIXED: data.resolved || 0,
          VERIFIED: data.verified || 0,
          CLOSED: data.closed || 0,
          WONT_FIX: 0,
          DUPLICATE: 0,
        } as Record<DefectStatus, number>,
        by_severity: {
          CRITICAL: data.critical || 0,
          MAJOR: data.high || 0,
          MINOR: data.medium || 0,
          TRIVIAL: data.low || 0,
        } as Record<DefectSeverity, number>,
      };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// FETCH SINGLE DEFECT
// ============================================================================

export function useDefect(defectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-defect', defectId],
    queryFn: async (): Promise<TMDefect | null> => {
      if (!defectId) return null;

      const { data, error } = await supabase
        .from('tm_defects')
        .select(`
          *,
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', defectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return mapDbRowToTMDefect(data);
    },
    enabled: !!defectId,
  });
}

// ============================================================================
// CREATE DEFECT
// ============================================================================

export function useCreateDefect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDefectInput & { project_id: string }): Promise<TMDefect> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const defectKey = await generateDefectKey(input.project_id);

      const { data, error } = await supabase
        .from('tm_defects')
        .insert({
          project_id: input.project_id,
          defect_key: defectKey,
          title: input.title,
          description: input.description,
          severity: severityToDb(input.severity),
          status: 'open',
          assignee_id: input.assigned_to || null,
          reporter_id: user.id,
          external_id: input.external_id || null,
          external_url: input.external_url || null,
          source_test_case_id: input.source_test_case_id ?? null,
          source_test_run_id: input.source_test_run_id ?? null,
          source_test_plan_id: input.source_test_plan_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Build auto-execution link rows
      const linkRows: Array<{
        defect_id: string;
        link_type: string;
        linked_id: string;
        entity_label: string | null;
        link_source: string;
        test_run_id?: string | null;
        step_result_id?: string | null;
        created_by: string;
      }> = [];

      // Row 1 — Test case link
      if (input.source_test_case_id) {
        linkRows.push({
          defect_id: data.id,
          link_type: 'test_case',
          linked_id: input.source_test_case_id,
          entity_label: input.title || null,
          link_source: 'auto_execution',
          created_by: user.id,
        });
      }

      // Row 2 — Execution run link
      if (input.run_id) {
        linkRows.push({
          defect_id: data.id,
          link_type: 'test_run',
          linked_id: input.run_id,
          entity_label: null,
          link_source: 'auto_execution',
          test_run_id: input.run_id,
          step_result_id: input.step_id || null,
          created_by: user.id,
        });
      }

      // Row 3 — Test cycle link (derive plan + release from cycle)
      if (input.cycle_id) {
        const { data: cycleRow } = await supabase
          .from('tm_test_cycles')
          .select('id, name, plan_id:plan_test_cycles(plan_id, tm_test_plans(id, name, release_id, releases(id, name)))')
          .eq('id', input.cycle_id)
          .single();

        if (cycleRow) {
          // Cycle row
          linkRows.push({
            defect_id: data.id,
            link_type: 'test_cycle',
            linked_id: cycleRow.id,
            entity_label: cycleRow.name || null,
            link_source: 'auto_execution',
            created_by: user.id,
          });

          // Plan row — derive from cycle via plan_test_cycles join
          const planLink = Array.isArray(cycleRow.plan_id) ? cycleRow.plan_id[0] : null;
          const planRow = planLink?.tm_test_plans;
          if (planRow?.id) {
            linkRows.push({
              defect_id: data.id,
              link_type: 'test_plan',
              linked_id: planRow.id,
              entity_label: planRow.name || null,
              link_source: 'auto_execution',
              created_by: user.id,
            });

            // Release row — derive from plan
            const releaseRow = Array.isArray(planRow.releases)
              ? planRow.releases[0]
              : planRow.releases;
            if (releaseRow?.id) {
              linkRows.push({
                defect_id: data.id,
                link_type: 'release',
                linked_id: releaseRow.id,
                entity_label: releaseRow.name || null,
                link_source: 'auto_execution',
                created_by: user.id,
              });
            }
          }
        }
      }

      // Row — Requirement link (derive from test case via tm_requirement_tests)
      if (input.source_test_case_id) {
        const { data: reqLink } = await supabase
          .from('tm_requirement_tests')
          .select('requirement_id, tm_requirements(id, title)')
          .eq('test_case_id', input.source_test_case_id)
          .limit(1)
          .single();

        if (reqLink?.requirement_id) {
          const reqRow = Array.isArray(reqLink.tm_requirements)
            ? reqLink.tm_requirements[0]
            : reqLink.tm_requirements;
          linkRows.push({
            defect_id: data.id,
            link_type: 'requirement',
            linked_id: reqLink.requirement_id,
            entity_label: reqRow?.title || null,
            link_source: 'auto_execution',
            created_by: user.id,
          });
        }
      }

      // Write all link rows in one batch
      if (linkRows.length > 0) {
        const { error: linkError } = await supabase
          .from('tm_defect_links')
          .insert(linkRows);
        if (linkError) {
          console.error('[useCreateDefect] tm_defect_links batch insert failed:', linkError);
          throw linkError;
        }
      }

      return mapDbRowToTMDefect(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect-stats', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['testcase-defects'] });
      toast.success(`Defect ${data.key} created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create defect: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE DEFECT
// ============================================================================

export function useUpdateDefect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDefectInput & { project_id: string }): Promise<TMDefect> => {
      const { id, project_id, severity, status, assigned_to, ...rest } = input;

      const updates: Record<string, any> = { ...rest };
      
      if (severity !== undefined) {
        updates.severity = severityToDb(severity);
      }
      if (status !== undefined) {
        updates.status = statusToDb(status);
        if (status === 'FIXED' || status === 'CLOSED' || status === 'VERIFIED') {
          updates.resolved_at = new Date().toISOString();
        }
      }
      if (assigned_to !== undefined) {
        updates.assignee_id = assigned_to;
      }

      const { data, error } = await supabase
        .from('tm_defects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...mapDbRowToTMDefect(data), project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defects', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect-stats', data.project_id] });
      toast.success('Defect updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update defect: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE DEFECT STATUS (Quick action)
// ============================================================================

export function useUpdateDefectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      status: DefectStatus;
      project_id: string;
    }): Promise<void> => {
      const updates: Record<string, any> = {
        status: statusToDb(input.status),
      };
      
      if (input.status === 'FIXED' || input.status === 'CLOSED' || input.status === 'VERIFIED') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tm_defects')
        .update(updates)
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defects', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect-stats', variables.project_id] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE DEFECT
// ============================================================================

export function useDeleteDefect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_defects')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defects', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-defect-stats', variables.project_id] });
      toast.success('Defect deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete defect: ${error.message}`);
    },
  });
}

// ============================================================================
// FETCH DEFECT COMMENTS (using generic tm_comments table)
// ============================================================================

export function useDefectComments(defectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-defect-comments', defectId],
    queryFn: async (): Promise<TMDefectComment[]> => {
      if (!defectId) return [];

      const { data, error } = await supabase
        .from('tm_comments')
        .select(`
          *,
          author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq('entity_type', 'defect')
        .eq('entity_id', defectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        defect_id: row.entity_id,
        user_id: row.author_id || '',
        content: row.content,
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
        user: row.author,
      }));
    },
    enabled: !!defectId,
  });
}

// ============================================================================
// ADD COMMENT
// ============================================================================

export function useAddDefectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      defect_id: string; 
      content: string;
    }): Promise<TMDefectComment> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tm_comments')
        .insert({
          entity_type: 'defect',
          entity_id: input.defect_id,
          author_id: user.id,
          content: input.content,
        })
        .select(`
          *,
          author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        defect_id: data.entity_id,
        user_id: data.author_id || '',
        content: data.content,
        created_at: data.created_at || '',
        updated_at: data.updated_at || '',
        user: data.author,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defect-comments', variables.defect_id] });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE COMMENT
// ============================================================================

export function useDeleteDefectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      defect_id: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('tm_comments')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-defect-comments', variables.defect_id] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}

// ============================================================================
// FETCH ATTACHMENTS
// ============================================================================

export function useDefectAttachments(defectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-defect-attachments', defectId],
    queryFn: async (): Promise<TMAttachment[]> => {
      if (!defectId) return [];

      const { data, error } = await supabase
        .from('tm_attachments')
        .select('*')
        .eq('entity_type', 'defect')
        .eq('entity_id', defectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        entity_type: row.entity_type as 'defect' | 'run' | 'step_result',
        entity_id: row.entity_id,
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size || 0,
        mime_type: row.mime_type || '',
        uploaded_by: row.uploaded_by || '',
        created_at: row.created_at || '',
      }));
    },
    enabled: !!defectId,
  });
}

// ============================================================================
// UPLOAD ATTACHMENT
// ============================================================================

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      entity_type: 'defect' | 'run' | 'step_result';
      entity_id: string;
      file: File;
    }): Promise<TMAttachment> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileName = `${input.entity_type}/${input.entity_id}/${Date.now()}_${input.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tm-attachments')
        .upload(fileName, input.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tm-attachments')
        .getPublicUrl(fileName);

      // Create attachment record
      const { data, error } = await supabase
        .from('tm_attachments')
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          file_name: input.file.name,
          file_path: publicUrl,
          file_size: input.file.size,
          mime_type: input.file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        entity_type: data.entity_type as 'defect' | 'run' | 'step_result',
        entity_id: data.entity_id,
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size || 0,
        mime_type: data.mime_type || '',
        uploaded_by: data.uploaded_by || '',
        created_at: data.created_at || '',
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`tm-${variables.entity_type}-attachments`, variables.entity_id] });
      toast.success('File uploaded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE ATTACHMENT
// ============================================================================

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      entity_type: string;
      entity_id: string;
      file_path: string;
    }): Promise<void> => {
      // Delete from storage
      const pathParts = input.file_path.split('/');
      const storagePath = pathParts.slice(-3).join('/'); // Get last 3 parts
      
      await supabase.storage
        .from('tm-attachments')
        .remove([storagePath]);

      // Delete record
      const { error } = await supabase
        .from('tm_attachments')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`tm-${variables.entity_type}-attachments`, variables.entity_id] });
      toast.success('Attachment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
}

// ============================================================================
// DEFECTS BY CYCLE (via defect_links)
// ============================================================================

export function useDefectsByCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-cycle-defects', cycleId],
    queryFn: async (): Promise<TMDefect[]> => {
      if (!cycleId) return [];

      // Get scope items for this cycle
      const { data: scopeItems } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', cycleId);

      if (!scopeItems || scopeItems.length === 0) return [];

      // Get run IDs for these scope items
      const { data: runs } = await supabase
        .from('tm_test_runs')
        .select('id')
        .in('cycle_scope_id', scopeItems.map(s => s.id));

      if (!runs || runs.length === 0) return [];

      const runIds = runs.map(r => r.id);

      // Get defect links for these runs
      const { data: links } = await supabase
        .from('tm_defect_links')
        .select('defect_id')
        .in('test_run_id', runIds);

      if (!links || links.length === 0) return [];

      const defectIds = [...new Set(links.map(l => l.defect_id))];

      // Get defects
      const { data, error } = await supabase
        .from('tm_defects')
        .select(`
          *,
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url)
        `)
        .in('id', defectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapDbRowToTMDefect);
    },
    enabled: !!cycleId,
  });
}
