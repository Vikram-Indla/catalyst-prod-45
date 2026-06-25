/**
 * Shared data helpers for the canonical Dependencies surface.
 *
 * Storage table is `ph_issue_dependencies` for ALL hubs (project / product /
 * incident) — Vikram 2026-06-25 "project jaisa". Only the META source differs:
 *   • project / incident → ph_issues
 *   • product            → business_requests (see ProductDependenciesPage)
 */

import { supabase } from '@/integrations/supabase/client';
import { extractRelease, extractSprint } from '@/components/shared/Timeline/dependencies/scheduleFields';
import type { Dependency, DependencyType, IssueMeta, Hierarchy } from './types';

const COLS =
  'issue_key, issue_type, summary, status, status_category, due_date, effective_due_date, assignee_account_id, assignee_display_name, sprint_name, raw_json, parent_key, project_key';

/** Build issueMeta + hierarchy (with parent-chain walk) from ph_issues for the
 *  given keys. Shared by project + incident hubs. */
export async function fetchPhIssueMeta(keys: string[]): Promise<{ issueMeta: IssueMeta; hierarchy: Hierarchy }> {
  const issueMeta: IssueMeta = {};
  const hierarchy: Hierarchy = {};
  if (keys.length === 0) return { issueMeta, hierarchy };

  const { data: issues, error } = await supabase.from('ph_issues').select(COLS).in('issue_key', keys);
  if (error) console.error('[Dependencies] ph issue meta load failed', error);
  for (const r of (issues || []) as any[]) {
    issueMeta[r.issue_key] = {
      issue_type: r.issue_type ?? null,
      summary: r.summary ?? null,
      status: r.status ?? null,
      status_category: r.status_category ?? null,
      due_date: r.due_date ?? null,
      assignee_account_id: r.assignee_account_id ?? null,
      assignee_display_name: r.assignee_display_name ?? null,
      release: extractRelease(r.raw_json).name,
      sprint: (r.sprint_name && r.sprint_name.trim()) ? r.sprint_name : extractSprint(r.raw_json).name,
      start_date: r.raw_json?.fields?.customfield_10015 ?? null,
      end_date: r.raw_json?.fields?.duedate ?? r.due_date ?? r.effective_due_date ?? null,
      parent_key: r.parent_key ?? null,
      project_key: r.project_key ?? null,
    };
    hierarchy[r.issue_key] = { issue_type: r.issue_type ?? null, parent_key: r.parent_key ?? null, summary: r.summary ?? null };
  }

  // Walk up the parent chain (for "Roll-up to") — gap-fill ancestors not loaded.
  let frontier = Array.from(
    new Set(Object.values(hierarchy).map((h) => h.parent_key).filter((k): k is string => !!k && !hierarchy[k])),
  );
  let depth = 0;
  while (frontier.length > 0 && depth < 6) {
    const { data: parents } = await supabase.from('ph_issues').select('issue_key, issue_type, summary, parent_key').in('issue_key', frontier);
    for (const p of (parents || []) as any[]) {
      hierarchy[p.issue_key] = { issue_type: p.issue_type ?? null, parent_key: p.parent_key ?? null, summary: p.summary ?? null };
    }
    frontier = Array.from(
      new Set((parents || []).map((p: any) => p.parent_key).filter((k: string | null): k is string => !!k && !hierarchy[k])),
    );
    depth += 1;
  }

  return { issueMeta, hierarchy };
}

/** Insert a dependency (all hubs write to ph_issue_dependencies). */
export async function createPhDependency(
  projectKey: string,
  sourceKey: string,
  targetKey: string,
  type: DependencyType,
): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { error } = await (supabase as any).from('ph_issue_dependencies').insert({
    project_key: projectKey,
    source_issue_key: sourceKey,
    target_issue_key: targetKey,
    dependency_type: type,
    created_by: userId,
  });
  if (error) throw error;
}

/** Soft-delete a dependency by id (all hubs). */
export async function deletePhDependency(id: number | string): Promise<void> {
  const { error } = await (supabase as any)
    .from('ph_issue_dependencies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Load active dependency rows by explicit project_key scope (project + product). */
export async function fetchDependenciesByScope(projectKey: string): Promise<Dependency[]> {
  const { data, error } = await (supabase as any)
    .from('ph_issue_dependencies')
    .select('*')
    .eq('project_key', projectKey)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Dependency[];
}
