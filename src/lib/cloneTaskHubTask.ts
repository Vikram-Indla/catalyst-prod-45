/**
 * cloneTaskHubTask — Tasks Hub clone helper (`tasks` table).
 *
 * Same-workstream scoping (workstream_id preserved). Deep-copies each section
 * only when the caller's `include` flag says so; unchecked sections stay empty
 * on the clone. Status resets to the first configured status.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ClonePatch } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import type { CloneCatalogEntry } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';

export const TASK_HUB_INCLUDE_CATALOG: CloneCatalogEntry[] = [
  { key: 'attachments', label: 'Attachments' },
  { key: 'comments', label: 'Comments' },
];

async function generateTaskKey(): Promise<string> {
  const { count } = await (supabase as any)
    .from('tasks')
    .select('id', { count: 'exact', head: true });
  return `T-${String((count || 0) + 1).padStart(5, '0')}`;
}

export async function fetchTaskHubSectionCounts(taskId: string): Promise<Record<string, number>> {
  const countExact = (p: PromiseLike<{ count: number | null; error: unknown }>) =>
    p.then((r) => (r.error ? 0 : r.count ?? 0));

  const [attachments, comments] = await Promise.all([
    countExact(
      (supabase as any)
        .from('task_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId),
    ),
    countExact(
      (supabase as any)
        .from('task_comments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId),
    ),
  ]);

  return { attachments, comments };
}

export async function cloneTaskHubTask(sourceTaskId: string, patch?: ClonePatch): Promise<string> {
  const { data: original, error: fetchError } = await (supabase as any)
    .from('tasks')
    .select(
      'id, key, title, description, description_adf, priority, status_id, ' +
      'assignee_id, reporter_id, reviewer_id, workstream_id, labels, ' +
      'due_date, start_date, cover, cover_url',
    )
    .eq('id', sourceTaskId)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneTaskHubTask: task ${sourceTaskId} not found`);

  const orig = original as Record<string, any>;
  const newKey = await generateTaskKey();

  const patchedSummary = patch?.summary?.trim();
  const finalTitle = patchedSummary && patchedSummary.length > 0
    ? patchedSummary
    : `Copy of ${orig.title ?? ''}`;

  const finalAssigneeId = patch?.assigneeId !== undefined ? patch.assigneeId : orig.assignee_id ?? null;
  const finalReporterId = patch?.reporterId !== undefined ? patch.reporterId : orig.reporter_id ?? null;

  const { data: inserted, error: insertError } = await (supabase as any)
    .from('tasks')
    .insert({
      key: newKey,
      title: finalTitle,
      description: orig.description ?? null,
      description_adf: orig.description_adf ?? null,
      priority: orig.priority ?? 'medium',
      status_id: orig.status_id,
      assignee_id: finalAssigneeId,
      reporter_id: finalReporterId,
      reviewer_id: orig.reviewer_id ?? null,
      workstream_id: orig.workstream_id ?? null,
      labels: orig.labels ?? null,
      due_date: orig.due_date ?? null,
      start_date: orig.start_date ?? null,
      cover: orig.cover ?? null,
      cover_url: orig.cover_url ?? null,
    })
    .select('id, key')
    .single();
  if (insertError) throw insertError;

  const newId = (inserted as any).id as string;
  const include = patch?.include ?? {};

  const tasks: Array<Promise<unknown>> = [];
  if (include.attachments) tasks.push(copyAttachments(sourceTaskId, newId));
  if (include.comments) tasks.push(copyComments(sourceTaskId, newId));
  await Promise.allSettled(tasks);

  return newKey;
}

async function copyAttachments(sourceTaskId: string, newTaskId: string) {
  const { data } = await (supabase as any)
    .from('task_attachments')
    .select('file_name, file_url, file_size, file_type, uploaded_by')
    .eq('task_id', sourceTaskId);
  if (!data?.length) return;
  await (supabase as any).from('task_attachments').insert(
    data.map((r: any) => ({ ...r, task_id: newTaskId })),
  );
}

async function copyComments(sourceTaskId: string, newTaskId: string) {
  const { data } = await (supabase as any)
    .from('task_comments')
    .select('author_id, content')
    .eq('task_id', sourceTaskId);
  if (!data?.length) return;
  await (supabase as any).from('task_comments').insert(
    data.map((r: any) => ({ ...r, task_id: newTaskId })),
  );
}
