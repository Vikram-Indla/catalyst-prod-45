/**
 * useTimelineDependencies — reads + mutates ph_issue_dependencies for the
 * timeline dependency mode. Single source of truth shared with the canvas
 * (DependenciesPage). Direction semantics live in `normalize.ts`.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildDependencyIndex,
  validateNewDependency,
  resolveCanonical,
  type RawDependencyRow,
  type DependencyIndex,
  type UiDirection,
} from './normalize';
import { extractSprint, extractRelease } from './scheduleFields';

const QK = (projectKeys: string[]) => ['timeline-dependencies', [...projectKeys].sort().join(',')] as const;

export interface AddDependencyArgs {
  rowKey: string;
  direction: UiDirection;
  otherKey: string;
  projectKey: string;
}

/** Lightweight issue metadata for dependency-referenced keys that are NOT in
 *  the loaded timeline tree (e.g. pre-2026 targets excluded by the date gate).
 *  Lets the dependency popovers render icon + summary for both ends. */
export interface DepIssueMeta {
  issueType: string | null;
  summary: string;
  status: string | null;
  assigneeDisplayName: string | null;
  dueDate: string | null;
  sprintEndDate: string | null;
  sprintName: string | null;
  releaseDate: string | null;
  releaseName: string | null;
}

export interface UseTimelineDependenciesResult {
  index: DependencyIndex;
  rows: RawDependencyRow[];
  /** Metadata for every key referenced by a dependency edge (both directions). */
  issueMeta: Map<string, DepIssueMeta>;
  isLoading: boolean;
  refetch: () => void;
  /** Validate then insert. Returns { ok } or { ok:false, error }. */
  addDependency: (args: AddDependencyArgs) => Promise<{ ok: boolean; error?: string }>;
  /** Soft-delete by edge id. */
  removeDependency: (edgeId: number | string) => Promise<{ ok: boolean; error?: string }>;
}

export function useTimelineDependencies(projectKeys: string[]): UseTimelineDependenciesResult {
  const queryClient = useQueryClient();
  const keys = useMemo(() => Array.from(new Set(projectKeys.filter(Boolean))), [projectKeys]);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: QK(keys),
    queryFn: async (): Promise<RawDependencyRow[]> => {
      if (keys.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('ph_issue_dependencies')
        .select('id, project_key, source_issue_key, target_issue_key, dependency_type, created_by, created_at, updated_at, deleted_at')
        .in('project_key', keys)
        .is('deleted_at', null);
      if (error) {
        console.error('[useTimelineDependencies] load failed', error);
        throw new Error(error.message ?? 'Failed to load dependencies');
      }
      return (data ?? []) as RawDependencyRow[];
    },
    enabled: keys.length > 0,
  });

  const index = useMemo(() => buildDependencyIndex(rows), [rows]);

  /* Every issue key touched by a dependency edge (source + target). */
  const referencedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.source_issue_key) s.add(r.source_issue_key);
      if (r.target_issue_key) s.add(r.target_issue_key);
    }
    return Array.from(s).sort();
  }, [rows]);

  /* Fetch icon/summary/status for referenced keys so the popovers can render
     BOTH ends identically — even targets outside the 2026-gated tree. */
  const { data: issueMeta = new Map<string, DepIssueMeta>() } = useQuery({
    queryKey: ['timeline-dep-issue-meta', referencedKeys.join(',')],
    queryFn: async (): Promise<Map<string, DepIssueMeta>> => {
      const m = new Map<string, DepIssueMeta>();
      if (referencedKeys.length === 0) return m;
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, issue_type, summary, status, assignee_display_name, due_date, effective_due_date, raw_json')
        .in('issue_key', referencedKeys);
      if (error) {
        console.error('[useTimelineDependencies] issue-meta load failed', error);
        return m;
      }
      for (const row of (data ?? [])) {
        const sp = extractSprint(row.raw_json);
        const rel = extractRelease(row.raw_json);
        m.set(row.issue_key, {
          issueType: row.issue_type ?? null,
          summary: row.summary ?? '',
          status: row.status ?? null,
          assigneeDisplayName: row.assignee_display_name ?? null,
          dueDate: row.effective_due_date ?? row.due_date ?? row.raw_json?.fields?.duedate ?? null,
          sprintEndDate: sp.endDate,
          sprintName: sp.name,
          releaseDate: rel.date,
          releaseName: rel.name,
        });
      }
      return m;
    },
    enabled: referencedKeys.length > 0,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK(keys) });

  const addDependency = async ({ rowKey, direction, otherKey, projectKey }: AddDependencyArgs) => {
    const verdict = validateNewDependency(index, rowKey, direction, otherKey);
    if (!verdict.ok) return verdict;

    const { blockerKey, dependentKey } = resolveCanonical(rowKey, direction, otherKey);
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    const { error } = await (supabase as any).from('ph_issue_dependencies').insert({
      project_key: projectKey,
      source_issue_key: blockerKey,
      target_issue_key: dependentKey,
      dependency_type: 'blocks',
      created_by: userId,
    });

    if (error) {
      const msg = String(error.message ?? '');
      if (msg.includes('duplicate') || msg.includes('unique')) return { ok: false, error: 'This dependency already exists' };
      if (msg.includes('source_not_target')) return { ok: false, error: 'A work item cannot depend on itself' };
      if (msg.includes('foreign key') || msg.includes('violates')) return { ok: false, error: 'Both work items must exist in the project' };
      return { ok: false, error: msg || 'Failed to add dependency' };
    }
    invalidate();
    return { ok: true };
  };

  const removeDependency = async (edgeId: number | string) => {
    const { error } = await (supabase as any)
      .from('ph_issue_dependencies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', edgeId);
    if (error) return { ok: false, error: String(error.message ?? 'Failed to remove dependency') };
    invalidate();
    return { ok: true };
  };

  return { index, rows, issueMeta, isLoading, refetch, addDependency, removeDependency };
}
