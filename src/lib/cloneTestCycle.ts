/**
 * cloneTestCycle — Test Hub clone helper (tm_test_cycles).
 *
 * Scoped to the same tm project as the source. Deep-copies each section only
 * when the caller's `include` flag says so; unchecked sections stay empty on
 * the clone. Test-case membership rows (tm_cycle_scope) are cloned by
 * reference — the underlying test cases are not duplicated.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ClonePatch } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import type { CloneCatalogEntry } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';

export const TEST_CYCLE_INCLUDE_CATALOG: CloneCatalogEntry[] = [
  { key: 'testCases', label: 'Test cases in cycle' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'comments', label: 'Comments' },
];

async function generateCycleKey(projectId: string): Promise<string> {
  try {
    const { data } = await (supabase as any).rpc('tm_next_entity_key', {
      p_prefix: 'CY',
      p_project_id: projectId,
    });
    if (data) return data as string;
  } catch { /* fall through */ }
  const { count } = await supabase
    .from('tm_test_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  return `CY-${String((count || 0) + 1).padStart(5, '0')}`;
}

export async function fetchTestCycleSectionCounts(cycleId: string): Promise<Record<string, number>> {
  const countExact = (p: PromiseLike<{ count: number | null; error: unknown }>) =>
    p.then((r) => (r.error ? 0 : r.count ?? 0));

  const [testCases, attachments, comments] = await Promise.all([
    countExact(
      (supabase as any)
        .from('tm_cycle_scope')
        .select('id', { count: 'exact', head: true })
        .eq('cycle_id', cycleId),
    ),
    countExact(
      (supabase as any)
        .from('tm_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'test_cycle')
        .eq('entity_id', cycleId),
    ),
    countExact(
      (supabase as any)
        .from('tm_comments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'test_cycle')
        .eq('entity_id', cycleId),
    ),
  ]);

  return { testCases, attachments, comments };
}

export async function cloneTestCycle(sourceCycleId: string, patch?: ClonePatch): Promise<string> {
  const { data: original, error: fetchError } = await supabase
    .from('tm_test_cycles')
    .select(
      'id, project_id, cycle_key, name, description, environment, environment_id, ' +
      'assigned_to, planned_start, planned_end, sprint_id, release_id, test_plan_id',
    )
    .eq('id', sourceCycleId)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneTestCycle: cycle ${sourceCycleId} not found`);

  const orig = original as Record<string, any>;
  const newKey = await generateCycleKey(orig.project_id);

  const patchedSummary = patch?.summary?.trim();
  const finalName = patchedSummary && patchedSummary.length > 0
    ? patchedSummary
    : `Copy of ${orig.name ?? ''}`;

  const finalAssignedTo = patch?.assigneeId !== undefined ? patch.assigneeId : orig.assigned_to ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from('tm_test_cycles')
    .insert({
      project_id: orig.project_id,
      cycle_key: newKey,
      name: finalName,
      description: orig.description ?? null,
      environment: orig.environment ?? null,
      environment_id: orig.environment_id ?? null,
      assigned_to: finalAssignedTo,
      planned_start: orig.planned_start ?? null,
      planned_end: orig.planned_end ?? null,
      sprint_id: orig.sprint_id ?? null,
      release_id: orig.release_id ?? null,
      test_plan_id: orig.test_plan_id ?? null,
      status: 'planned' as any,
    } as any)
    .select('id, cycle_key')
    .single();
  if (insertError) throw insertError;

  const newId = (inserted as any).id as string;
  const include = patch?.include ?? {};

  const tasks: Array<Promise<unknown>> = [];
  if (include.testCases) tasks.push(copyCycleScope(sourceCycleId, newId));
  if (include.attachments) tasks.push(copyAttachments(sourceCycleId, newId));
  if (include.comments) tasks.push(copyComments(sourceCycleId, newId));
  await Promise.allSettled(tasks);

  return newKey;
}

async function copyCycleScope(sourceCycleId: string, newCycleId: string) {
  const { data } = await supabase
    .from('tm_cycle_scope')
    .select('test_case_id, assigned_to, priority, sort_order, due_date')
    .eq('cycle_id', sourceCycleId);
  if (!data?.length) return;
  await supabase.from('tm_cycle_scope').insert(
    data.map((r: any) => ({ ...r, cycle_id: newCycleId })) as any,
  );
}

async function copyAttachments(sourceCycleId: string, newCycleId: string) {
  const { data } = await (supabase as any)
    .from('tm_attachments')
    .select('file_name, file_path, file_size, mime_type, uploaded_by')
    .eq('entity_type', 'test_cycle')
    .eq('entity_id', sourceCycleId);
  if (!data?.length) return;
  await (supabase as any).from('tm_attachments').insert(
    data.map((r: any) => ({
      ...r,
      entity_type: 'test_cycle',
      entity_id: newCycleId,
    })),
  );
}

async function copyComments(sourceCycleId: string, newCycleId: string) {
  const { data } = await (supabase as any)
    .from('tm_comments')
    .select('author_id, content, parent_id')
    .eq('entity_type', 'test_cycle')
    .eq('entity_id', sourceCycleId);
  if (!data?.length) return;
  await (supabase as any).from('tm_comments').insert(
    data.map((r: any) => ({
      ...r,
      entity_type: 'test_cycle',
      entity_id: newCycleId,
    })),
  );
}
