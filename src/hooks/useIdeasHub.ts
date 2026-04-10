/**
 * Ideas Hub — TanStack Query Hooks
 * Direct Supabase queries for all Ideation CRUD + analytics.
 * ZERO hardcoded data. ALL from ph_ideas / ph_idea_comments / profiles.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ═══ TYPES ═══
export interface IdeaRow {
  id: string;
  idea_key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  idea_type: string | null;
  source: string | null;
  theme: string | null;
  assigned_team: string | null;
  assigned_to_name: string | null;
  assignee_id: string | null;
  department: string | null;
  roadmap_quarter: string | null;
  target_release_date: string | null;
  is_committed: boolean;
  impact_total: number;
  impact_investor_fit: number;
  impact_market_size: number;
  impact_problem_severity: number;
  impact_user_benefit: number;
  impact_complexity_inv: number;
  impact_time_to_value: number;
  vote_count: number;
  created_at: string;
  updated_at: string;
  linked_initiative_key: string | null;
  ai_enrichment_status: string | null;
  is_deleted: boolean;
}

export interface IdeaThemeSummary {
  theme: string;
  idea_count: number;
}

export interface IdeaStats {
  total: number;
  inPipeline: number;
  approved: number;
  themeCount: number;
  byStatus: { status: string; count: number }[];
  byQuarter: { quarter: string; count: number }[];
  byTheme: { theme: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// ═══ QUERY KEYS ═══
export const ideasHubKeys = {
  ideas: (filters?: any) => ['ideas-hub', filters] as const,
  idea: (id: string) => ['ideas-hub', 'detail', id] as const,
  ideaByKey: (key: string) => ['ideas-hub', 'byKey', key] as const,
  stats: () => ['ideas-hub', 'stats'] as const,
  themes: () => ['ideas-hub', 'themes'] as const,
  comments: (ideaId: string) => ['ideas-hub', 'comments', ideaId] as const,
  profiles: () => ['ideas-hub', 'profiles'] as const,
};

// ═══ IDEAS LIST ═══
export function useIdeasHub(filters?: {
  status?: string;
  theme?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ideasHubKeys.ideas(filters),
    queryFn: async (): Promise<IdeaRow[]> => {
      let query = typedQuery('ph_ideas_listing')
        .select('*')
        .eq('is_deleted', false);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.theme) {
        query = query.eq('theme', filters.theme);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,idea_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) { console.warn('Ideas query error:', error.message); return []; }
      return (data ?? []).map((r: any) => ({
        ...r,
        impact_total: parseFloat(r.impact_total) || 0,
        impact_investor_fit: parseFloat(r.impact_investor_fit) || 0,
        impact_market_size: parseFloat(r.impact_market_size) || 0,
        impact_problem_severity: parseFloat(r.impact_problem_severity) || 0,
        impact_user_benefit: parseFloat(r.impact_user_benefit) || 0,
        impact_complexity_inv: parseFloat(r.impact_complexity_inv) || 0,
        impact_time_to_value: parseFloat(r.impact_time_to_value) || 0,
        vote_count: r.vote_count || 0,
        is_committed: r.is_committed ?? false,
      }));
    },
  });
}

// ═══ SINGLE IDEA BY KEY ═══
export function useIdeaByKey(ideaKey: string | null) {
  return useQuery({
    queryKey: ideasHubKeys.ideaByKey(ideaKey!),
    queryFn: async (): Promise<IdeaRow | null> => {
      const { data, error } = await typedQuery('ph_ideas_listing')
        .select('*')
        .eq('idea_key', ideaKey)
        .single();
      if (error) throw error;
      return {
        ...data,
        impact_total: parseFloat(data.impact_total) || 0,
        impact_investor_fit: parseFloat(data.impact_investor_fit) || 0,
        impact_market_size: parseFloat(data.impact_market_size) || 0,
        impact_problem_severity: parseFloat(data.impact_problem_severity) || 0,
        impact_user_benefit: parseFloat(data.impact_user_benefit) || 0,
        impact_complexity_inv: parseFloat(data.impact_complexity_inv) || 0,
        impact_time_to_value: parseFloat(data.impact_time_to_value) || 0,
        vote_count: data.vote_count || 0,
        is_committed: data.is_committed ?? false,
      };
    },
    enabled: !!ideaKey,
  });
}

// ═══ STATS ═══
export function useIdeaStats() {
  return useQuery({
    queryKey: ideasHubKeys.stats(),
    queryFn: async (): Promise<IdeaStats> => {
      const { data, error } = await typedQuery('ph_ideas')
        .select('status, priority, theme, roadmap_quarter')
        .eq('is_deleted', false);
      if (error) throw error;
      const rows = data ?? [];
      const total = rows.length;
      const inPipeline = rows.filter((r: any) => r.roadmap_quarter).length;
      const approved = rows.filter((r: any) => r.status === 'Approved').length;
      const themes = new Set(rows.filter((r: any) => r.theme).map((r: any) => r.theme));

      const statusMap: Record<string, number> = {};
      const quarterMap: Record<string, number> = {};
      const themeMap: Record<string, number> = {};
      const priorityMap: Record<string, number> = {};

      rows.forEach((r: any) => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
        if (r.roadmap_quarter) quarterMap[r.roadmap_quarter] = (quarterMap[r.roadmap_quarter] || 0) + 1;
        if (r.theme) themeMap[r.theme] = (themeMap[r.theme] || 0) + 1;
        if (r.priority) priorityMap[r.priority] = (priorityMap[r.priority] || 0) + 1;
      });

      return {
        total,
        inPipeline,
        approved,
        themeCount: themes.size,
        byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        byQuarter: Object.entries(quarterMap).map(([quarter, count]) => ({ quarter, count })).sort((a, b) => a.quarter.localeCompare(b.quarter)),
        byTheme: Object.entries(themeMap).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count),
        byPriority: Object.entries(priorityMap).map(([priority, count]) => ({ priority, count })).sort((a, b) => a.priority.localeCompare(b.priority)),
      };
    },
  });
}

// ═══ THEME SUMMARY ═══
export function useIdeaThemeSummary() {
  return useQuery({
    queryKey: ideasHubKeys.themes(),
    queryFn: async (): Promise<IdeaThemeSummary[]> => {
      const { data, error } = await supabase
        .from('ph_ideas')
        .select('theme')
        .eq('is_deleted', false)
        .not('theme', 'is', null)
        .neq('theme', '');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.theme) counts[r.theme] = (counts[r.theme] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([theme, idea_count]) => ({ theme, idea_count }))
        .sort((a, b) => b.idea_count - a.idea_count);
    },
  });
}

// ═══ COMMENTS ═══
export function useIdeaHubComments(ideaId: string | null) {
  return useQuery({
    queryKey: ideasHubKeys.comments(ideaId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_idea_comments')
        .select('*')
        .eq('idea_id', ideaId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const comments = data ?? [];
      if (comments.length === 0) return [];

      const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return comments.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
      }));
    },
    enabled: !!ideaId,
  });
}

export function useCreateIdeaComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ideaId, userId, content }: { ideaId: string; userId: string; content: string }) => {
      const { data, error } = await supabase
        .from('ph_idea_comments')
        .insert({ idea_id: ideaId, user_id: userId, content } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ideasHubKeys.comments(vars.ideaId) });
      toast.success('Comment posted');
    },
    onError: (e: Error) => toast.error('Failed to post comment: ' + e.message),
  });
}

// ═══ CREATE IDEA ═══
export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea: {
      title: string;
      status?: string;
      priority?: string;
      idea_type?: string;
      source?: string;
      theme?: string;
      assigned_team?: string;
      roadmap_quarter?: string;
      description?: string;
    }) => {
      // Generate next idea_key
      const { data: maxKey } = await supabase
        .from('ph_ideas')
        .select('idea_key')
        .order('created_at', { ascending: false })
        .limit(1);
      const lastNum = maxKey?.[0]?.idea_key ? parseInt(maxKey[0].idea_key.replace('IDH-', '')) : 0;
      const newKey = `IDH-${String(lastNum + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('ph_ideas')
        .insert({
          idea_key: newKey,
          title: idea.title,
          status: idea.status || 'Draft',
          priority: idea.priority || 'P2',
          idea_type: idea.idea_type || 'Feature Request',
          source: idea.source || 'Internal',
          theme: idea.theme || null,
          assigned_team: idea.assigned_team || null,
          roadmap_quarter: idea.roadmap_quarter || null,
          description: idea.description || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas-hub'] });
      toast.success('Idea created');
    },
    onError: (e: Error) => toast.error('Failed to create idea: ' + e.message),
  });
}

// ═══ UPDATE IDEA ═══
export function useUpdateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('ph_ideas')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas-hub'] });
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['ideas-roadmap'] });
      toast.success('Changes saved');
    },
    onError: (e: Error) => toast.error('Save failed: ' + e.message),
  });
}

// ═══ DELETE IDEA ═══
export function useDeleteIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ph_ideas')
        .update({ is_deleted: true, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas-hub'] });
      toast.success('Idea deleted');
    },
    onError: (e: Error) => toast.error('Delete failed: ' + e.message),
  });
}

// ═══ PROFILES ═══
export function useProfiles() {
  return useQuery({
    queryKey: ideasHubKeys.profiles(),
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
