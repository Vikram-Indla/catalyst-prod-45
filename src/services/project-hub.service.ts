/**
 * ProjectHub SDLC Service Layer
 * TanStack Query hooks for ph_sdlc_issues, ph_sdlc_releases, ph_boards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IssueType, IssueStatus, IssuePriority, IssueSource, BoardConfig, CardFieldConfig } from '@/types/project-hub.types';

// ─── TYPES ───────────────────────────────────────────

export interface PHIssue {
  id: string;
  key: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  description: string | null;
  assignee_id: string | null;
  release_id: string | null;
  due_date: string | null;
  overdue_days: number;
  source: IssueSource;
  jira_key: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface PHRelease {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PHBoard {
  id: string;
  name: string;
  columns: any[];
  card_fields: CardFieldConfig;
  filters: Record<string, any>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ─── QUERY KEYS ──────────────────────────────────────

export const phKeys = {
  issues: ['ph-sdlc-issues'] as const,
  issue: (id: string) => ['ph-sdlc-issues', id] as const,
  releases: ['ph-sdlc-releases'] as const,
  boards: ['ph-sdlc-boards'] as const,
};

// ─── ISSUES ──────────────────────────────────────────

export interface IssueFilters {
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  release_id?: string;
  assignee_id?: string;
  source?: IssueSource;
  search?: string;
}

/** Fetch all issues (soft-deleted excluded via RLS) */
export function useProjectIssues(filters?: IssueFilters) {
  return useQuery({
    queryKey: [...phKeys.issues, filters?.status, filters?.type, filters?.priority, filters?.release_id, filters?.assignee_id, filters?.source, filters?.search],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      let q = supabase
        .from('ph_sdlc_issues')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.type) q = q.eq('type', filters.type);
      if (filters?.priority) q = q.eq('priority', filters.priority);
      if (filters?.release_id) q = q.eq('release_id', filters.release_id);
      if (filters?.assignee_id) q = q.eq('assignee_id', filters.assignee_id);
      if (filters?.source) q = q.eq('source', filters.source);
      if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PHIssue[];
    },
  });
}

/** Fetch single issue with children */
export function useProjectIssue(id: string | null) {
  return useQuery({
    queryKey: phKeys.issue(id ?? ''),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!id) return null;
      const { data: issue, error } = await supabase
        .from('ph_sdlc_issues')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      if (!issue) return null;

      // Fetch children
      const { data: children } = await supabase
        .from('ph_sdlc_issues')
        .select('id, key, title, type, status, priority, sort_order')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('sort_order');

      return { ...(issue as PHIssue), children: children ?? [] };
    },
    enabled: !!id,
  });
}

/** Create issue */
export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PHIssue> & { key: string; title: string; type: IssueType }) => {
      const { data, error } = await supabase
        .from('ph_sdlc_issues')
        .insert({
          key: input.key,
          title: input.title,
          type: input.type,
          status: input.status ?? 'backlog',
          priority: input.priority ?? 'medium',
          description: input.description ?? null,
          assignee_id: input.assignee_id ?? null,
          release_id: input.release_id ?? null,
          due_date: input.due_date ?? null,
          source: input.source ?? 'catalyst',
          jira_key: input.jira_key ?? null,
          parent_id: input.parent_id ?? null,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PHIssue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: phKeys.issues });
    },
  });
}

/** Update issue */
export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PHIssue> & { id: string }) => {
      const { data, error } = await supabase
        .from('ph_sdlc_issues')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PHIssue;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: phKeys.issues });
      qc.invalidateQueries({ queryKey: phKeys.issue(data.id) });
    },
  });
}

/** Soft-delete issue */
export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ph_sdlc_issues')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: phKeys.issues });
    },
  });
}

// ─── RELEASES ────────────────────────────────────────

/** Fetch all SDLC releases */
export function useSDLCReleases() {
  return useQuery({
    queryKey: phKeys.releases,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_sdlc_releases')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PHRelease[];
    },
  });
}

// ─── BOARDS ──────────────────────────────────────────

/** Fetch all board configs */
export function useBoards() {
  return useQuery({
    queryKey: phKeys.boards,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_boards')
        .select('*')
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PHBoard[];
    },
  });
}

/** Update board config */
export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PHBoard> & { id: string }) => {
      const { data, error } = await supabase
        .from('ph_boards')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PHBoard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: phKeys.boards });
    },
  });
}

// ─── DISPLAY KEY HELPER ──────────────────────────────

/** Get the display key for an issue: Jira key if source=jira, else Catalyst key */
export function getDisplayKey(issue: PHIssue): string {
  return issue.source === 'jira' ? (issue.jira_key || issue.key) : issue.key;
}
