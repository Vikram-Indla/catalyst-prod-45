/**
 * G25 Defect Management Hooks
 * Queries tm_defects schema (TestHub isolated defect tables)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Defect, DefectStats, DefectFilters, DefectHistoryEntry, DefectComment, DefectLink } from '@/types/defects';
import { toast } from 'sonner';

// ─── List Defects ────────────────────────────────────────────────
export function useDefectsG25(filters?: DefectFilters) {
  return useQuery({
    queryKey: ['g25-defects', filters],
    queryFn: async (): Promise<Defect[]> => {
      let query = typedQuery('tm_defects')
        .select(`
          *,
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url),
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) query = query.in('status', filters.status);
      if (filters?.severity?.length) query = query.in('severity', filters.severity);
      if (filters?.priority?.length) query = query.in('priority', filters.priority);
      if (filters?.assignedTo) {
        if (filters.assignedTo === 'unassigned') query = query.is('assigned_to', null);
        else query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,defect_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Defect[];
    },
  });
}

// ─── Stats ───────────────────────────────────────────────────────
export function useDefectStatsG25() {
  return useQuery({
    queryKey: ['g25-defect-stats'],
    queryFn: async (): Promise<DefectStats> => {
      const { data, error } = await supabase.rpc('get_defect_stats', { p_project_id: null });
      if (error) throw new Error(error.message);
      return data as unknown as DefectStats;
    },
  });
}

// ─── Single Defect ───────────────────────────────────────────────
export function useDefectG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect', defectId],
    queryFn: async (): Promise<Defect | null> => {
      if (!defectId) return null;
      const { data, error } = await typedQuery('tm_defects')
        .select(`
          *,
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url),
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', defectId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Defect;
    },
    enabled: !!defectId,
  });
}

// ─── Create ──────────────────────────────────────────────────────
export function useCreateDefectG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { run_id, ...defectPayload } = input;
      const { data, error } = await typedQuery('tm_defects')
        .insert({ ...defectPayload, reported_by: user.id } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      // Link defect to execution run if run_id was provided
      if (run_id && data?.id) {
        const { error: linkError } = await typedQuery('tm_defect_links')
          .insert({ defect_id: data.id, test_run_id: run_id, created_by: user.id });
        if (linkError) {
          console.error('[useCreateDefectG25] tm_defect_links insert failed:', linkError.message);
        }
      }
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['g25-defects'] });
      qc.invalidateQueries({ queryKey: ['g25-defect-stats'] });
      toast.success(`Defect ${data.defect_key} created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Update ──────────────────────────────────────────────────────
export function useUpdateDefectG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await typedQuery('tm_defects')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['g25-defects'] });
      qc.invalidateQueries({ queryKey: ['g25-defect', data.id] });
      qc.invalidateQueries({ queryKey: ['g25-defect-stats'] });
      toast.success('Defect updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Change Status ───────────────────────────────────────────────
export function useChangeDefectStatusG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, status, resolution }: { defectId: string; status: string; resolution?: string }) => {
      const updates: Record<string, any> = { status };
      if (resolution) updates.resolution = resolution;
      if (['resolved', 'fixed'].includes(status)) updates.resolved_at = new Date().toISOString();
      if (status === 'verified') updates.verified_at = new Date().toISOString();
      if (status === 'closed') updates.closed_at = new Date().toISOString();
      if (['new', 'open', 'in_progress', 'reopened'].includes(status)) {
        updates.resolved_at = null; updates.verified_at = null; updates.closed_at = null;
      }
      const { data, error } = await typedQuery('tm_defects').update(updates as any).eq('id', defectId).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['g25-defects'] });
      qc.invalidateQueries({ queryKey: ['g25-defect', data.id] });
      qc.invalidateQueries({ queryKey: ['g25-defect-stats'] });
      qc.invalidateQueries({ queryKey: ['g25-defect-history', data.id] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Delete ──────────────────────────────────────────────────────
export function useDeleteDefectG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (defectId: string) => {
      const { error } = await typedQuery('tm_defects').delete().eq('id', defectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g25-defects'] });
      qc.invalidateQueries({ queryKey: ['g25-defect-stats'] });
      toast.success('Defect deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── History (via tm_defect_links → th_test_executions) ──────────
export function useDefectHistoryG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect-history', defectId],
    queryFn: async () => {
      if (!defectId) return [];
      // 1. Get linked execution run IDs
      const { data: links, error: linkErr } = await typedQuery('tm_defect_links')
        .select('id, test_run_id, step_result_id, created_at')
        .eq('defect_id', defectId);
      if (linkErr || !links?.length) return [];

      const runIds = links
        .map((l: any) => l.test_run_id)
        .filter(Boolean) as string[];
      if (!runIds.length) return [];

      // 2. Fetch executions for those runs
      const { data: execs, error: execErr } = await supabase
        .from('th_test_executions')
        .select('id, result, executed_at, executed_by, notes, test_case_id, cycle_scope_id')
        .in('id', runIds)
        .order('executed_at', { ascending: false });
      if (execErr || !execs?.length) return [];

      // 3. Resolve executor names
      const userIds = [...new Set(execs.map((e: any) => e.executed_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name]));
        }
      }

      return execs.map((e: any) => ({
        id: e.id,
        action: e.result,
        performed_by: profileMap[e.executed_by] || 'Unknown',
        performed_at: e.executed_at,
        notes: e.notes,
        test_case_id: e.test_case_id,
      }));
    },
    enabled: !!defectId,
  });
}

// ─── Comments (via tm_comments generic table) ───────────────────
export function useDefectCommentsG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect-comments', defectId],
    queryFn: async (): Promise<DefectComment[]> => {
      if (!defectId) return [];
      const { data, error } = await supabase
        .from('tm_comments')
        .select(`*, creator:profiles!tm_comments_author_id_fkey(full_name, avatar_url)`)
        .eq('entity_type', 'defect')
        .eq('entity_id', defectId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map((c: any) => ({
        id: c.id,
        defect_id: defectId,
        comment: c.content,
        created_by: c.author_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        creator: c.creator,
      })) as DefectComment[];
    },
    enabled: !!defectId,
  });
}

export function useCreateDefectCommentG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, comment }: { defectId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tm_comments')
        .insert({ entity_type: 'defect', entity_id: defectId, content: comment, author_id: user.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ...data, defect_id: defectId };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['g25-defect-comments', data.defect_id] });
      toast.success('Comment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDefectCommentG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, defectId }: { commentId: string; defectId: string }) => {
      const { error } = await supabase.from('tm_comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
      return defectId;
    },
    onSuccess: (defectId) => {
      qc.invalidateQueries({ queryKey: ['g25-defect-comments', defectId] });
      toast.success('Comment deleted');
    },
  });
}

// ─── Links ───────────────────────────────────────────────────────
export function useDefectLinksG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect-links', defectId],
    queryFn: async (): Promise<DefectLink[]> => {
      if (!defectId) return [];
      const { data, error } = await typedQuery('tm_defect_links')
        .select('*')
        .eq('defect_id', defectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const links = (data || []) as unknown as DefectLink[];
      // Resolve test case links
      for (const link of links) {
        if (link.link_type === 'test_case') {
          const { data: tc } = await typedQuery('tm_test_cases')
            .select('id, case_key, title')
            .eq('id', link.linked_id)
            .single();
          if (tc) link.test_case = tc as any;
        }
      }
      return links;
    },
    enabled: !!defectId,
  });
}

export function useCreateDefectLinkG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, linkType, linkedId, entityLabel }: { defectId: string; linkType: string; linkedId: string; entityLabel?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await typedQuery('tm_defect_links')
        .insert({ defect_id: defectId, link_type: linkType, linked_id: linkedId, entity_label: entityLabel || null, link_source: 'manual', created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['g25-defect-links', data.defect_id] });
      toast.success('Link added');
    },
  });
}

export function useDeleteDefectLinkG25() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, defectId }: { linkId: string; defectId: string }) => {
      const { error } = await typedQuery('tm_defect_links').delete().eq('id', linkId);
      if (error) throw new Error(error.message);
      return defectId;
    },
    onSuccess: (defectId) => {
      qc.invalidateQueries({ queryKey: ['g25-defect-links', defectId] });
      toast.success('Link removed');
    },
  });
}

// ─── Defects by Cycle ────────────────────────────────────────────
export const useDefectsByCycleId = (cycleId: string | undefined) => {
  return useQuery({
    queryKey: ['defects-by-cycle', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('tm_defect_links')
        .select(`
          id,
          link_source,
          entity_label,
          defect:tm_defects(
            id,
            defect_key,
            title,
            status,
            severity,
            priority
          )
        `)
        .eq('linked_id', cycleId)
        .eq('link_type', 'test_cycle');
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row.defect,
        link_source: row.link_source,
        entity_label: row.entity_label,
      }));
    },
  });
};

// ─── Defects by Plan ─────────────────────────────────────────────
export const useDefectsByPlanId = (planId: string | undefined) => {
  return useQuery({
    queryKey: ['defects-by-plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from('tm_defect_links')
        .select(`
          id,
          link_source,
          entity_label,
          defect:tm_defects(
            id,
            defect_key,
            title,
            status,
            severity,
            priority
          )
        `)
        .eq('linked_id', planId)
        .eq('link_type', 'test_plan');
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row.defect,
        link_source: row.link_source,
        entity_label: row.entity_label,
      }));
    },
  });
};
