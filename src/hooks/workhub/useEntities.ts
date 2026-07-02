/**
 * Generic entity hub hooks — works for both ph_releases and ph_jira_sprints
 * via EntityConfig. Per CLAUDE.md "ADOPT CANONICAL — DO NOT REIMPLEMENT".
 *
 * 2026-06-26: introduced to back the /project-hub/:key/sprints surface
 * without forking useReleases.ts. Existing useWHReleases / useReleaseProgress
 * etc. are kept as thin wrappers for callsite stability.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { recordAdvisoryStatusChange } from '@/lib/workflow/canonical/runtime';
import {
  type EntityConfig,
  RELEASE_CONFIG,
  SPRINT_CONFIG,
} from '@/lib/entity-hub/config';

// ─── Generic hooks ───────────────────────────────────────────────────────────

export function useEntities(config: EntityConfig) {
  return useQuery({
    queryKey: [config.queryKeyPrefix, 'list'],
    queryFn: async () => {
      let builder = (supabase as any)
        .from(config.table)
        .select('*');
      // S0.4: sprints are soft-deleted via deleted_at (26 dead Jira imports
      // purged 2026-07-02). Only ph_jira_sprints has the column.
      if (config.kind === 'sprint') {
        builder = builder.is('deleted_at', null);
      }
      const { data, error } = await builder
        .order('sort_order')
        .order('target_date');
      if (error) throw new Error(error.message);
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

export function useEntity(config: EntityConfig, id: string) {
  return useQuery({
    queryKey: [config.queryKeyPrefix, 'item', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    enabled: !!id,
  });
}

export function useEntityProgress(config: EntityConfig) {
  return useQuery({
    queryKey: [config.queryKeyPrefix, 'progress'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.progressView)
        .select('*')
        .order('target_date');
      if (error) throw new Error(error.message);
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

export function useEntityProgressById(config: EntityConfig, id: string) {
  return useQuery({
    queryKey: [config.queryKeyPrefix, 'progress', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.progressView)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateEntity(config: EntityConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newRow: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .insert(newRow)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      catalystToast.success(`${config.label.singular} created`);
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

export function useUpdateEntity(config: EntityConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from(config.table)
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      catalystToast.success(`${config.label.singular} updated`);
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

export function useDeleteEntity(config: EntityConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Releases unlink work items via ph_work_items.release_id; sprints
      // have no equivalent FK column today (link is via ph_issues.sprint_name).
      // Skip the unlink step for sprints to avoid a non-existent column error.
      if (config.kind === 'release') {
        await (supabase as any)
          .from('ph_work_items')
          .update({ release_id: null })
          .eq('release_id', id);
      }
      const { error } = await (supabase as any)
        .from(config.table)
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      catalystToast.success(`${config.label.singular} deleted`);
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

// ─── Thin sprint wrappers ────────────────────────────────────────────────────

export const useSprints              = () => useEntities(SPRINT_CONFIG);
export const useSprint               = (id: string) => useEntity(SPRINT_CONFIG, id);
export const useSprintProgress       = () => useEntityProgress(SPRINT_CONFIG);
export const useSprintProgressById   = (id: string) => useEntityProgressById(SPRINT_CONFIG, id);
export const useCreateSprint         = () => useCreateEntity(SPRINT_CONFIG);
export const useUpdateSprint         = () => useUpdateEntity(SPRINT_CONFIG);
export const useDeleteSprint         = () => useDeleteEntity(SPRINT_CONFIG);

/**
 * Sprint canonical update — same as useUpdateSprint but writes advisory audit
 * when the status field changes (A-lite: ph_jira_sprints.status IS canonical).
 */
export function useCanonicalSprintUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from(SPRINT_CONFIG.table)
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message);
      // Advisory audit for status changes (A-lite: status IS the canonical store).
      if (updates.status) {
        recordAdvisoryStatusChange({
          entityKey: 'sprint', entityId: id, projectKey: null,
          fromStatusRaw: null, toStatusRaw: updates.status, sourceSurface: 'sprint_manager',
        }).catch(() => {/* advisory — non-blocking */});
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SPRINT_CONFIG.queryKeyPrefix] });
      catalystToast.success(`${SPRINT_CONFIG.label.singular} updated`);
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });
}

// Re-export RELEASE_CONFIG-bound wrappers for symmetry (existing callsites
// still use useWHReleases from useReleases.ts; both paths work).
export const useReleasesNew          = () => useEntities(RELEASE_CONFIG);
export const useReleaseProgressNew   = () => useEntityProgress(RELEASE_CONFIG);
