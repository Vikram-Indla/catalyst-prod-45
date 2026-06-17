/**
 * Saved Filters Hooks — Phase 9 + Filters Module (BAU-filters-01)
 * CRUD for ph_saved_filters table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// ads-scanner:ignore-next-line — toast is the approved notification primitive in data-layer hooks
import { catalystToast } from '@/lib/catalystToast';

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
  viewers_config: { type: 'private' | 'project' | 'product' | 'everyone' | 'specific' | 'org'; user_ids?: string[] };
  editors_config: { type: 'owner_only' | 'specific'; user_ids?: string[] };
  starred_by_user_ids: string[];
  subscriber_ids: string[];
  owner_id: string | null;
  used_by_board_ids: string[];
  hub_scope: HubScope;
  last_used_at: string | null;
  use_count: number;
  health_status: FilterHealth;
  // Jira directory sync (migration 20260610200000) — verbatim Jira structures
  jira_filter_id?: string | null;
  jira_owner_name?: string | null;
  jira_owner_account_id?: string | null;
  share_permissions?: JiraSharePermission[];
  edit_permissions?: JiraSharePermission[];
  // joined
  owner?: OwnerProfile | null;
}

/** Verbatim Jira /rest/api/3/filter sharePermissions entry (subset we render) */
export interface JiraSharePermission {
  type: 'project' | 'group' | 'user' | 'loggedin' | 'organization' | 'authenticated' | 'global' | 'project-unknown';
  project?: { key?: string; name?: string };
  role?: { name?: string };
  group?: { name?: string };
  user?: { displayName?: string };
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

export interface CreateSavedFilterParams {
  name: string;
  filter_config: Record<string, any>;
  page?: string;
  is_shared?: boolean;
  jql_query?: string | null;
  description?: string | null;
  hub_scope?: HubScope;
  viewers_config?: SavedFilterFull['viewers_config'];
  editors_config?: SavedFilterFull['editors_config'];
  owner_id?: string | null;
  project_key?: string | null;
  product_key?: string | null;
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateSavedFilterParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .insert({
          name: params.name,
          filter_config: params.filter_config,
          page: params.page || 'workitems',
          is_shared: params.is_shared ?? false,
          jql_query: params.jql_query ?? null,
          description: params.description ?? null,
          hub_scope: params.hub_scope ?? 'project',
          viewers_config: params.viewers_config ?? { type: 'private' },
          editors_config: params.editors_config ?? { type: 'owner_only' },
          owner_id: params.owner_id ?? user?.id ?? null,
          user_id: user?.id ?? null,
          project_key: params.project_key ?? null,
          product_key: params.product_key ?? null,
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      catalystToast.success('Filter saved');
      if (data?.id) {
        supabase
          .from('ph_filter_versions' as any)
          .insert({ filter_id: data.id, jql_query: data.jql_query ?? null, changed_by: data.user_id ?? null })
          .then(() => qc.invalidateQueries({ queryKey: ['filters', 'versions', data.id] }));
      }
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

export interface UpdateSavedFilterParams {
  name?: string;
  filter_config?: Record<string, any>;
  is_shared?: boolean;
  jql_query?: string | null;
  description?: string | null;
  hub_scope?: HubScope;
  viewers_config?: SavedFilterFull['viewers_config'];
  editors_config?: SavedFilterFull['editors_config'];
  owner_id?: string | null;
  project_key?: string | null;
  product_key?: string | null;
}

export function useUpdateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSavedFilterParams }) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data: unknown, vars: { id: string; updates: UpdateSavedFilterParams }) => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      catalystToast.success('Filter updated');
      if (vars.updates.jql_query !== undefined) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          supabase
            .from('ph_filter_versions' as any)
            .insert({ filter_id: vars.id, jql_query: vars.updates.jql_query ?? null, changed_by: user?.id ?? null })
            .then(() => qc.invalidateQueries({ queryKey: ['filters', 'versions', vars.id] }));
        });
      }
    },
    onError: (err: Error) => catalystToast.error(err.message),
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
      qc.invalidateQueries({ queryKey: ['filters'] });
      catalystToast.success('Filter deleted');
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

// ─── Filters Module hooks (BAU-filters-01) ───────────────────────────────────

/** P0-38: Derive health_status client-side.
 *  - broken: has jql_query but it contains a bare field name with no value (= "" or ends with operator)
 *  - stale:  last_used_at older than 30 days OR never used and created > 7 days ago
 *  - healthy: everything else
 */
export function computeFilterHealth(f: Pick<SavedFilterFull, 'jql_query' | 'last_used_at' | 'use_count' | 'created_at'>): FilterHealth {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS  = 7  * 24 * 60 * 60 * 1000;

  if (f.jql_query) {
    const broken = /\b(=|!=|in|not in)\s*"?"?\s*(AND|OR|ORDER|$)/i.test(f.jql_query);
    if (broken) return 'broken';
  }

  if (f.last_used_at && now - new Date(f.last_used_at).getTime() > THIRTY_DAYS) return 'stale';
  if (!f.last_used_at && f.use_count === 0 && now - new Date(f.created_at).getTime() > SEVEN_DAYS) return 'stale';

  return 'healthy';
}

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
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('ph_saved_filters')
        .select('*, owner:profiles!ph_saved_filters_owner_id_fkey(id, full_name, avatar_url)')
        .order('name', { ascending: true });

      if (hubScope && hubScope !== 'both') {
        query = query.in('hub_scope', [hubScope, 'both']);
      }

      // Scope to the specific project/product/incident/tasks hub.
      // 2026-06-17 (Vikram directive): STRICT per-hub scoping for every
      // hub — no OR-NULL fallback. Each hub MUST only show filters whose
      // originating hub key matches. Cross-hub leakage (a project filter
      // appearing under tasks, or a null-project legacy filter showing
      // up everywhere) is a P0 UX defect. Filters saved before
      // originating-hub identity was tracked will need a backfill
      // migration to land in the correct hub directory.
      if (projectKey) {
        if (hubScope === 'product') {
          query = query.eq('product_key', projectKey);
        } else {
          query = query.eq('project_key', projectKey);
        }
      }

      // Only return filters the current user owns or that are public (is_shared).
      // Prevents filters from other hubs/owners leaking into Quick Filters dropdowns.
      if (user) {
        query = (query as any).or(`owner_id.eq.${user.id},is_shared.eq.true`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as SavedFilterFull[];
      return rows.map(f => ({ ...f, health_status: computeFilterHealth(f) }));
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
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

/** Toggle subscription on a filter — subscribers receive change notifications */
export function useToggleFilterSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ filterId, currentSubscriberIds, userId }: {
      filterId: string;
      currentSubscriberIds: string[];
      userId: string;
    }) => {
      const isSubscribed = currentSubscriberIds.includes(userId);
      const next = isSubscribed
        ? currentSubscriberIds.filter(id => id !== userId)
        : [...currentSubscriberIds, userId];
      const { error } = await supabase
        .from('ph_saved_filters')
        .update({ subscriber_ids: next } as any)
        .eq('id', filterId);
      if (error) throw new Error(error.message);
      return { isSubscribed, next };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      catalystToast.success(result.isSubscribed ? 'Unsubscribed from filter' : 'Subscribed — you\'ll be notified on changes');
    },
    onError: (err: Error) => catalystToast.error(err.message),
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
      catalystToast.success('Filter copied');
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

// ─── Version history (O9) ─────────────────────────────────────────────────────

export interface FilterVersion {
  id: string;
  filter_id: string;
  jql_query: string | null;
  result_count: number | null;
  changed_by: string | null;
  changed_at: string;
  changer?: { full_name: string | null; avatar_url: string | null } | null;
}

/**
 * Fetch the version history for a single filter.
 * ph_filter_versions is ordered by changed_at desc.
 */
export function useFilterVersions(filterId: string | undefined) {
  return useQuery({
    queryKey: ['filters', 'versions', filterId],
    queryFn: async () => {
      if (!filterId) return [] as FilterVersion[];
      const { data, error } = await supabase
        .from('ph_filter_versions' as any)
        .select('*, changer:profiles!ph_filter_versions_changed_by_fkey(full_name, avatar_url)')
        .eq('filter_id', filterId)
        .order('changed_at', { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return (data ?? []) as FilterVersion[];
    },
    enabled: !!filterId,
    staleTime: 60_000,
  });
}

/** Record a new version snapshot for the given filter */
export function useRecordFilterVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      filterId,
      jqlQuery,
      resultCount,
    }: {
      filterId: string;
      jqlQuery: string | null;
      resultCount?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ph_filter_versions' as any)
        .insert({
          filter_id: filterId,
          jql_query: jqlQuery,
          result_count: resultCount ?? null,
          changed_by: user?.id ?? null,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['filters', 'versions', vars.filterId] });
    },
  });
}

// ─── O10 — Kanban board ↔ filter link ────────────────────────────────────────

export interface BoardOption {
  id: string;
  name: string;
}

/** Fetch boards available for the given project key */
export function useBoardsForProject(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['boards-for-project', projectKey],
    queryFn: async () => {
      if (!projectKey) return [] as BoardOption[];
      const { data, error } = await (supabase as any)
        .from('boards')
        .select('id, name')
        .eq('jira_project_key', projectKey.toUpperCase())
        .is('deleted_at', null)
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []).map((b: any) => ({ id: b.id, name: b.name })) as BoardOption[];
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });
}

/**
 * Dedup lookup for the filter→Kanban vertical.
 *
 * A board counts as a duplicate only when it is backed by the SAME source
 * filter AND owned by the SAME user (agreed policy: dedup on (owner, filter_id)).
 * Soft-deleted boards (deleted_at set) are ignored. Returns the existing
 * board { id, name } if one is found, otherwise null — the create flow uses
 * this to offer "Open existing" instead of creating a second board.
 */
export function useExistingBoardForFilter(
  filterId: string | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['existing-board-for-filter', filterId, userId],
    queryFn: async (): Promise<BoardOption | null> => {
      if (!filterId || !userId) return null;
      const { data, error } = await (supabase as any)
        .from('boards')
        .select('id, name')
        .eq('filter_id', filterId)
        .eq('created_by', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw new Error(error.message);
      const row = (data ?? [])[0];
      return row ? ({ id: row.id, name: row.name } as BoardOption) : null;
    },
    enabled: !!filterId && !!userId,
    staleTime: 60_000,
  });
}

/**
 * Associate (or disassociate) a saved filter with a kanban board.
 *
 * On link:   sets boards.filter_id = filterId and adds boardId to
 *            ph_saved_filters.used_by_board_ids
 * On unlink: clears boards.filter_id and removes boardId from used_by_board_ids
 */
export function useToggleFilterBoardLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      filterId,
      boardId,
      currentUsedByBoardIds,
      link,
    }: {
      filterId: string;
      boardId: string;
      currentUsedByBoardIds: string[];
      link: boolean;
    }) => {
      const nextBoardIds = link
        ? [...new Set([...currentUsedByBoardIds, boardId])]
        : currentUsedByBoardIds.filter(id => id !== boardId);

      const [filterErr, boardErr] = await Promise.all([
        supabase
          .from('ph_saved_filters')
          .update({ used_by_board_ids: nextBoardIds } as any)
          .eq('id', filterId)
          .then(({ error }) => error),
        (supabase as any)
          .from('boards')
          .update({ filter_id: link ? filterId : null })
          .eq('id', boardId)
          .then(({ error }: any) => error),
      ]);

      if (filterErr) throw new Error(filterErr.message);
      if (boardErr)  throw new Error(boardErr.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      qc.invalidateQueries({ queryKey: ['project-boards'] });
      catalystToast.success('Board link updated');
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

/**
 * P0-37 — Fire-and-forget: bump use_count + last_used_at when a saved filter is applied.
 * Called from BacklogPage and AllWork after a ?filterId param is consumed.
 */
export function useRecordFilterUsage() {
  return useMutation({
    mutationFn: async (filterId: string) => {
      const { data: current } = await supabase
        .from('ph_saved_filters')
        .select('use_count')
        .eq('id', filterId)
        .single();
      await supabase
        .from('ph_saved_filters')
        .update({
          use_count: ((current as any)?.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        } as any)
        .eq('id', filterId);
    },
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
      catalystToast.success('Filter owner updated');
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}
