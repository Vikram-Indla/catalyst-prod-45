/**
 * useFilterDerivedViews — hooks for the filter_derived_views container table.
 *
 * Filter-backed derived views (Feature 2: Roadmap; Feature 3: Dashboard) are
 * persisted in `filter_derived_views`. This module owns all CRUD for that table.
 *
 * Mirrors the pattern established by useExistingBoardForFilter / useCreateKanbanFromFilter
 * in useSavedFilters.ts and useCreateKanbanFromFilter.ts.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoadmapViewOption {
  id: string;
  title: string;
}

export interface CreateRoadmapFromFilterArgs {
  filterId: string;
  title: string;
  ownerId: string;
  /** Persisted display config chosen by the user in the create modal. */
  config: {
    date_field: 'due_date' | 'created' | 'updated';
    lane_by: 'status' | 'assignee' | 'issueType' | 'projectKey';
    zoom?: 'monthly' | 'quarterly' | 'weekly';
  };
  visibility: 'private' | 'org';
}

/**
 * Dedup hook: does this (filterId, owner) pair already have a roadmap?
 * Returns { id, title } when found, null otherwise.
 * Stays disabled until both filterId and userId are present.
 *
 * Mirrors useExistingBoardForFilter — same query-key shape, same enabled guard,
 * same staleTime.
 */
export function useExistingRoadmapForFilter(
  filterId: string | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['existing-roadmap-for-filter', filterId, userId],
    queryFn: async (): Promise<RoadmapViewOption | null> => {
      if (!filterId || !userId) return null;
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .select('id, title')
        .eq('source_filter_id', filterId)
        .eq('owner_id', userId)
        .eq('type', 'roadmap')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw new Error(error.message);
      const row = (data ?? [])[0];
      return row ? ({ id: row.id, title: row.title } as RoadmapViewOption) : null;
    },
    enabled: !!filterId && !!userId,
    staleTime: 60_000,
  });
}

/**
 * Create a filter-backed roadmap view.
 * Inserts one row into filter_derived_views and back-links nothing on the filter
 * (the roadmap reads JQL live — there is no used_by_* array on ph_saved_filters
 * for roadmaps yet; add when needed).
 */
export function useCreateRoadmapFromFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      filterId,
      title,
      ownerId,
      config,
      visibility,
    }: CreateRoadmapFromFilterArgs): Promise<string> => {
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .insert({
          source_filter_id: filterId,
          type: 'roadmap',
          title,
          owner_id: ownerId,
          shared_default_config: config,
          visibility,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['existing-roadmap-for-filter'] });
      qc.invalidateQueries({ queryKey: ['filter-derived-views'] });
    },
  });
}

// ── Feature 3: Dashboard ──────────────────────────────────────────────────────

export interface DashboardViewOption {
  id: string;
  title: string;
}

export interface CreateDashboardFromFilterArgs {
  filterId: string;
  title: string;
  /** Caller must obtain this from supabase.auth.getUser() — never rely on auth.uid() (lesson #3). */
  ownerId: string;
  visibility: 'private' | 'org';
}

/**
 * Dedup hook: does this (filterId, owner) pair already have a dashboard?
 * Returns { id, title } when found, null otherwise.
 * Mirrors useExistingRoadmapForFilter — same shape, type='dashboard'.
 */
export function useExistingDashboardForFilter(
  filterId: string | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['existing-dashboard-for-filter', filterId, userId],
    queryFn: async (): Promise<DashboardViewOption | null> => {
      if (!filterId || !userId) return null;
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .select('id, title')
        .eq('source_filter_id', filterId)
        .eq('owner_id', userId)
        .eq('type', 'dashboard')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw new Error(error.message);
      const row = (data ?? [])[0];
      return row ? ({ id: row.id, title: row.title } as DashboardViewOption) : null;
    },
    enabled: !!filterId && !!userId,
    staleTime: 60_000,
  });
}

/**
 * Create a filter-backed dashboard view.
 * Inserts one row into filter_derived_views (type='dashboard').
 * v1 uses an empty shared_default_config — the Executive Summary bundle
 * is the only template and requires no persisted config.
 */
export function useCreateDashboardFromFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      filterId,
      title,
      ownerId,
      visibility,
    }: CreateDashboardFromFilterArgs): Promise<string> => {
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .insert({
          source_filter_id: filterId,
          type: 'dashboard',
          title,
          owner_id: ownerId,
          shared_default_config: {},
          visibility,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['existing-dashboard-for-filter'] });
      qc.invalidateQueries({ queryKey: ['filter-derived-views'] });
    },
  });
}
