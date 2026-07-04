/**
 * cloneTestCase — Test Hub clone helper (tm_test_cases).
 *
 * Scoped to the same tm project as the source. Deep-copies each section only
 * when the caller's `include` flag says so; unchecked sections stay empty on
 * the clone.
 *
 * NOTE: the existing `tm_clone_test_case` RPC references a stale `key` column
 * (renamed to `case_key` in a later migration) and doesn't respect our
 * per-section flags. This helper does a manual clone directly against the
 * live schema.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ClonePatch } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import type { CloneCatalogEntry } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';

export const TEST_CASE_INCLUDE_CATALOG: CloneCatalogEntry[] = [
  { key: 'steps', label: 'Steps' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'comments', label: 'Comments' },
  { key: 'linkedItems', label: 'Linked work items' },
];

async function generateCaseKey(projectId: string): Promise<string> {
  try {
    const { data } = await (supabase as any).rpc('tm_next_entity_key', {
      p_prefix: 'TC',
      p_project_id: projectId,
    });
    if (data) return data as string;
  } catch { /* fall through */ }
  const { count } = await supabase
    .from('tm_test_cases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  return `TC-${String((count || 0) + 1).padStart(5, '0')}`;
}

export async function fetchTestCaseSectionCounts(caseId: string): Promise<Record<string, number>> {
  const countExact = (p: PromiseLike<{ count: number | null; error: unknown }>) =>
    p.then((r) => (r.error ? 0 : r.count ?? 0));

  const [steps, attachments, comments, linkedItems] = await Promise.all([
    countExact(
      (supabase as any)
        .from('tm_test_steps')
        .select('id', { count: 'exact', head: true })
        .eq('test_case_id', caseId),
    ),
    countExact(
      (supabase as any)
        .from('tm_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'test_case')
        .eq('entity_id', caseId),
    ),
    countExact(
      (supabase as any)
        .from('tm_comments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'test_case')
        .eq('entity_id', caseId),
    ),
    countExact(
      (supabase as any)
        .from('tm_test_case_links')
        .select('id', { count: 'exact', head: true })
        .eq('test_case_id', caseId),
    ),
  ]);

  return { steps, attachments, comments, linkedItems };
}

/**
 * Clones a tm_test_cases row within the same project + folder. Returns the
 * new case_key.
 */
export async function cloneTestCase(sourceCaseId: string, patch?: ClonePatch): Promise<string> {
  const { data: original, error: fetchError } = await supabase
    .from('tm_test_cases')
    .select(
      'id, project_id, folder_id, case_key, title, description, description_html, ' +
      'expected_result, preconditions, preconditions_html, postconditions_html, ' +
      'priority_id, case_type_id, status, test_format, ' +
      'gherkin_feature, gherkin_scenario, labels, custom_fields, ' +
      'assigned_to, is_template',
    )
    .eq('id', sourceCaseId)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneTestCase: case ${sourceCaseId} not found`);

  const orig = original as Record<string, any>;
  const newKey = await generateCaseKey(orig.project_id);

  const patchedSummary = patch?.summary?.trim();
  const finalTitle = patchedSummary && patchedSummary.length > 0
    ? patchedSummary
    : `Copy of ${orig.title ?? ''}`;

  const finalAssignedTo = patch?.assigneeId !== undefined ? patch.assigneeId : orig.assigned_to ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from('tm_test_cases')
    .insert({
      project_id: orig.project_id,
      folder_id: orig.folder_id ?? null,
      case_key: newKey,
      title: finalTitle,
      description: orig.description ?? null,
      description_html: orig.description_html ?? null,
      expected_result: orig.expected_result ?? null,
      preconditions: orig.preconditions ?? null,
      preconditions_html: orig.preconditions_html ?? null,
      postconditions_html: orig.postconditions_html ?? null,
      priority_id: orig.priority_id ?? null,
      case_type_id: orig.case_type_id ?? null,
      status: 'draft',
      test_format: orig.test_format ?? null,
      gherkin_feature: orig.gherkin_feature ?? null,
      gherkin_scenario: orig.gherkin_scenario ?? null,
      labels: orig.labels ?? [],
      custom_fields: orig.custom_fields ?? null,
      assigned_to: finalAssignedTo,
      is_template: orig.is_template ?? false,
      cloned_from_id: orig.id,
      archived: false,
    } as any)
    .select('id, case_key')
    .single();
  if (insertError) throw insertError;

  const newId = (inserted as any).id as string;
  const include = patch?.include ?? {};

  const tasks: Array<Promise<unknown>> = [];
  if (include.steps) tasks.push(copySteps(sourceCaseId, newId));
  if (include.attachments) tasks.push(copyAttachments(sourceCaseId, newId));
  if (include.comments) tasks.push(copyComments(sourceCaseId, newId));
  if (include.linkedItems) tasks.push(copyLinks(sourceCaseId, newId));
  await Promise.allSettled(tasks);

  return newKey;
}

async function copySteps(sourceCaseId: string, newCaseId: string) {
  const { data } = await supabase
    .from('tm_test_steps')
    .select('step_number, action, action_html, expected_result, expected_result_html, test_data, notes, is_optional, estimated_time_seconds, is_shared, shared_step_id')
    .eq('test_case_id', sourceCaseId)
    .order('step_number', { ascending: true });
  if (!data?.length) return;
  await supabase.from('tm_test_steps').insert(
    data.map((r: any) => ({ ...r, test_case_id: newCaseId })) as any,
  );
}

async function copyAttachments(sourceCaseId: string, newCaseId: string) {
  const { data } = await (supabase as any)
    .from('tm_attachments')
    .select('file_name, file_path, file_size, mime_type, uploaded_by')
    .eq('entity_type', 'test_case')
    .eq('entity_id', sourceCaseId);
  if (!data?.length) return;
  await (supabase as any).from('tm_attachments').insert(
    data.map((r: any) => ({
      ...r,
      entity_type: 'test_case',
      entity_id: newCaseId,
    })),
  );
}

async function copyComments(sourceCaseId: string, newCaseId: string) {
  const { data } = await (supabase as any)
    .from('tm_comments')
    .select('author_id, content, parent_id')
    .eq('entity_type', 'test_case')
    .eq('entity_id', sourceCaseId);
  if (!data?.length) return;
  await (supabase as any).from('tm_comments').insert(
    data.map((r: any) => ({
      ...r,
      entity_type: 'test_case',
      entity_id: newCaseId,
    })),
  );
}

async function copyLinks(sourceCaseId: string, newCaseId: string) {
  const { data } = await (supabase as any)
    .from('tm_test_case_links')
    .select('linked_item_id, linked_item_type, linked_by')
    .eq('test_case_id', sourceCaseId);
  if (!data?.length) return;
  await (supabase as any).from('tm_test_case_links').insert(
    data.map((r: any) => ({ ...r, test_case_id: newCaseId })),
  );
}
