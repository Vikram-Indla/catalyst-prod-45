/**
 * Saved Filters Hooks — Phase 9 + Filters Module (BAU-filters-01)
 * CRUD for ph_saved_filters table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedFilter {
  id: string;
  name: string;
  user_id?: string;
  is_shared: boolean;
  filter_config: Record<string, any>;
  page: string;
  created_at: string;
  updated_at: string;
}

export type FilterHealth = 'healthy' | 'stale' | 'broken';
export type HubScope = 'project' | 'product' | 'both';

export interface OwnerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Extended interface covering all columns added in migration 20260522000000 */
export interface SavedFilterFull extends SavedFilter {
  description: string | null;
  jql_query: string | null;
  viewers_config: { type: 'private' | 'org' | 'specific'; user_ids?: string[] };
  editors_config: { type: 'owner_only' | 'specific'; user_ids?: string[] };
  starred_by_user_ids: string[];
  owner_id: string | null;
  used_by_board_ids: string[];
  hub_scope: HubScope;
  last_used_at: string | null;
  use_count: number;
  health_status: FilterHealth;
  // joined
  owner?: OwnerProfile | null;
}

export function useSavedFilters(page?: string) {
  return useQuery({
    queryKey: ['workhub', 'saved-filters', page],
    queryFn: async () => {
      let query = supabase.from('ph_saved_filters').select('*').order('name');
      if (page) query = query.eq('page', page);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SavedFilter[];
    },
    staleTime: 30_000,
  });
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; filter_config: Record<string, any>; page?: string; is_shared?: boolean }) => {
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .insert({
          name: params.name,
          filter_config: params.filter_config,
          page: params.page || 'workitems',
          is_shared: params.is_shared || false,
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ name: string; filter_config: Record<string, any>; is_shared: boolean }> }) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Filters Module hooks (BAU-filters-01) ───────────────────────────────────

const FILTERS_QUERY_KEY = (hubScope?: HubScope, projectKey?: string) =>
  ['filters', 'list', hubScope ?? 'all', projectKey ?? 'global'] as const;

/**
 * Primary hook for the Filters list page.
 * Returns all filters visible to the current user, scoped by hub and project.
 * Owner profile is joined via Supabase FK expansion.
 */
export function useFiltersForProject(projectKey?: string, hubScope?: HubScope) {
  return useQuery({
    queryKey: FILTERS_QUERY_KEY(hubScope, projectKey),
    queryFn: async () => {
      let query = supabase
        .from('ph_saved_filters')
        .select('*, owner:profiles!ph_saved_filters_owner_id_fkey(id, full_name, avatar_url)')
        .order('name', { ascending: true });

      if (hubScope && hubScope !== 'both') {
        query = query.in('hub_scope', [hubScope, 'both']);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SavedFilterFull[];
    },
    staleTime: 30_000,
  });
}

/** Toggle star on a filter for the current user */
export function useStarFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ filterId, currentStarredIds, userId }: {
      filterId: string;
      currentStarredIds: string[];
      userId: string;
    }) => {
      const isStarred = currentStarredIds.includes(userId);
      const next = isStarred
        ? currentStarredIds.filter(id => id !== userId)
        : [...currentStarredIds, userId];
      const { error } = await supabase
        .from('ph_saved_filters')
        .update({ starred_by_user_ids: next } as any)
        .eq('id', filterId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filters'] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Duplicate a filter as "Copy of [name]" owned by the current user */
export function useCopyFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: SavedFilterFull) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ph_saved_filters')
        .insert({
          name: `Copy of ${source.name}`,
          description: source.description,
          jql_query: source.jql_query,
          filter_config: source.filter_config,
          page: source.page,
          is_shared: false,
          hub_scope: source.hub_scope,
          user_id: user.id,
          owner_id: user.id,
          viewers_config: { type: 'private' },
          editors_config: { type: 'owner_only' },
        } as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      toast.success('Filter copied');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Transfer ownership of a filter to another user */
export function useChangeFilterOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ filterId, newOwnerId }: { filterId: string; newOwnerId: string }) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .update({ owner_id: newOwnerId } as any)
        .eq('id', filterId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      toast.success('Filter owner updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
