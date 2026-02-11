/**
 * G25 Defect Management Hooks
 * Queries th_defects schema (TestHub isolated defect tables)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Defect, DefectStats, DefectFilters, DefectHistoryEntry, DefectComment, DefectLink } from '@/types/defects';
import { toast } from 'sonner';

// ─── List Defects ────────────────────────────────────────────────
export function useDefectsG25(filters?: DefectFilters) {
  return useQuery({
    queryKey: ['g25-defects', filters],
    queryFn: async (): Promise<Defect[]> => {
      let query = supabase
        .from('th_defects' as any)
        .select(`
          *,
          reporter:profiles!th_defects_reported_by_fkey(id, full_name, avatar_url),
          assignee:profiles!th_defects_assigned_to_fkey(id, full_name, avatar_url)
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
      const { data, error } = await supabase.rpc('get_defect_stats');
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
      const { data, error } = await supabase
        .from('th_defects' as any)
        .select(`
          *,
          reporter:profiles!th_defects_reported_by_fkey(id, full_name, avatar_url),
          assignee:profiles!th_defects_assigned_to_fkey(id, full_name, avatar_url)
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
      const { data, error } = await supabase
        .from('th_defects' as any)
        .insert({ ...input, reported_by: user.id } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from('th_defects' as any)
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
      const { data, error } = await supabase.from('th_defects' as any).update(updates as any).eq('id', defectId).select().single();
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
      const { error } = await supabase.from('th_defects' as any).delete().eq('id', defectId);
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

// ─── History ─────────────────────────────────────────────────────
export function useDefectHistoryG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect-history', defectId],
    queryFn: async (): Promise<DefectHistoryEntry[]> => {
      if (!defectId) return [];
      const { data, error } = await supabase
        .from('th_defect_history' as any)
        .select(`*, changer:profiles!th_defect_history_changed_by_fkey(full_name, avatar_url)`)
        .eq('defect_id', defectId)
        .order('changed_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as DefectHistoryEntry[];
    },
    enabled: !!defectId,
  });
}

// ─── Comments ────────────────────────────────────────────────────
export function useDefectCommentsG25(defectId: string | undefined) {
  return useQuery({
    queryKey: ['g25-defect-comments', defectId],
    queryFn: async (): Promise<DefectComment[]> => {
      if (!defectId) return [];
      const { data, error } = await supabase
        .from('th_defect_comments' as any)
        .select(`*, creator:profiles!th_defect_comments_created_by_fkey(full_name, avatar_url)`)
        .eq('defect_id', defectId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as DefectComment[];
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
        .from('th_defect_comments' as any)
        .insert({ defect_id: defectId, comment, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
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
      const { error } = await supabase.from('th_defect_comments' as any).delete().eq('id', commentId);
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
      const { data, error } = await supabase
        .from('th_defect_links' as any)
        .select('*')
        .eq('defect_id', defectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const links = (data || []) as unknown as DefectLink[];
      // Resolve test case links
      for (const link of links) {
        if (link.link_type === 'test_case') {
          const { data: tc } = await supabase
            .from('th_test_cases' as any)
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
    mutationFn: async ({ defectId, linkType, linkedId }: { defectId: string; linkType: string; linkedId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('th_defect_links' as any)
        .insert({ defect_id: defectId, link_type: linkType, linked_id: linkedId, created_by: user?.id } as any)
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
      const { error } = await supabase.from('th_defect_links' as any).delete().eq('id', linkId);
      if (error) throw new Error(error.message);
      return defectId;
    },
    onSuccess: (defectId) => {
      qc.invalidateQueries({ queryKey: ['g25-defect-links', defectId] });
      toast.success('Link removed');
    },
  });
}
