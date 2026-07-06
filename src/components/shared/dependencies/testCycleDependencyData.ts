/**
 * Test Hub data adapter for the canonical Dependencies surface.
 *
 * Storage: tm_test_cycle_dependencies (cycle → cycle). Meta source: tm_test_cycles.
 * Mirrors phDependencyData.ts, but cycles are referenced by UUID id (not key)
 * because cycle_key is unique only within a project and Test Hub is global.
 *
 * The canonical Dependency / IssueMeta contract is issue-key shaped — we map the
 * cycle UUID into the `*_issue_key` / meta-key slots. Candidate.value is also the
 * cycle UUID; human labels carry the readable "<PROJECT> CY-001 — name".
 */

import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import type { Dependency, DependencyType, IssueMeta, Hierarchy } from './types';

/** Build issueMeta + hierarchy from tm_test_cycles for the given cycle ids. */
export async function fetchCycleMeta(ids: string[]): Promise<{ issueMeta: IssueMeta; hierarchy: Hierarchy }> {
  const issueMeta: IssueMeta = {};
  const hierarchy: Hierarchy = {};
  if (ids.length === 0) return { issueMeta, hierarchy };

  const { data: cycles, error } = await supabase
    .from('tm_test_cycles')
    .select('id, cycle_key, name, status, project_id, planned_start, planned_end')
    .in('id', ids);
  if (error) console.error('[TestCycleDependencies] cycle meta load failed', error);

  // Resolve project id → key for the "Space" filter + readable summary.
  const projectIds = Array.from(new Set((cycles ?? []).map((c: any) => c.project_id).filter(Boolean)));
  const keyById = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase.from('tm_projects').select('id, key').in('id', projectIds);
    for (const p of (projects ?? []) as any[]) keyById.set(p.id, p.key);
  }

  for (const c of (cycles ?? []) as any[]) {
    const projectKey = keyById.get(c.project_id) ?? null;
    const readableKey = projectKey ? `${projectKey} ${c.cycle_key ?? ''}`.trim() : (c.cycle_key ?? '');
    issueMeta[c.id] = {
      issue_type: 'Test Cycle',
      // Node id is the cycle UUID; the readable key ("<PROJECT> CY-001") drives
      // the card title, and the cycle name stays as the summary/subtitle —
      // mirroring how issue hubs render key + summary. Empty readableKey → null
      // so the title falls back rather than showing a blank (zero-assumption).
      displayKey: readableKey || null,
      // Test cycles have no /browse/<key> route; the cycle detail page resolves a
      // UUID param directly (useTestCycleByKey → isValidUUID branch), so link to
      // the cycle route instead of a 404 /browse/<uuid>.
      href: Routes.testHub.cycle(c.id),
      summary: c.name ?? null,
      status: c.status ?? null,
      status_category: null,
      due_date: c.planned_end ?? null,
      assignee_account_id: null,
      assignee_display_name: null,
      release: null,
      sprint: null,
      start_date: c.planned_start ?? null,
      end_date: c.planned_end ?? null,
      parent_key: null,
      project_key: projectKey,
    };
    hierarchy[c.id] = { issue_type: 'Test Cycle', parent_key: null, summary: c.name ?? readableKey };
  }

  return { issueMeta, hierarchy };
}

/** Insert a cycle → cycle dependency. */
export async function createTestCycleDependency(
  projectKey: string | null,
  sourceCycleId: string,
  targetCycleId: string,
  type: DependencyType,
): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { error } = await (supabase as any).from('tm_test_cycle_dependencies').insert({
    project_key: projectKey,
    source_cycle_id: sourceCycleId,
    target_cycle_id: targetCycleId,
    dependency_type: type,
    created_by: userId,
  });
  if (error) throw error;
}

/** Soft-delete a dependency by id. */
export async function deleteTestCycleDependency(id: number | string): Promise<void> {
  const { error } = await (supabase as any)
    .from('tm_test_cycle_dependencies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Load all active dependency rows (global — Test Hub aggregates every project). */
export async function fetchTestCycleDependencies(): Promise<Dependency[]> {
  const { data, error } = await (supabase as any)
    .from('tm_test_cycle_dependencies')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Map UUID cycle columns into the canonical issue-key shaped Dependency.
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    project_key: r.project_key ?? '',
    source_issue_key: r.source_cycle_id,
    target_issue_key: r.target_cycle_id,
    dependency_type: r.dependency_type,
    created_by: r.created_by ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
  })) as Dependency[];
}
